-- Trade 0004 — analisi economica, cruscotto, creazione azienda, utenti, archivio bolle, permessi finali.

-- ---------- Analisi vendite ----------
-- Ricavo: righe dei DDT di vendita confermati/fatturati (resi cliente in negativo).
-- Costo: costo medio registrato sui movimenti di scarico di ogni riga (solo con vedere_costi).
create function public.analisi_vendite(_dal date, _al date, _per text default 'mese')
returns table (chiave text, etichetta text, qta numeric, ricavo numeric, costo numeric, margine numeric, perc_margine numeric, documenti bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  az uuid := public.azienda_corrente();
  costi boolean := public.ha_permesso('vedere_costi');
begin
  if not public.ha_permesso('vedere_analisi') then raise exception 'Permesso negato'; end if;
  if _per not in ('mese','cliente','articolo','categoria','agente') then raise exception 'Raggruppamento non valido'; end if;
  return query
  with righe as (
    select d.id as ddt_id, d.data, d.soggetto_id, r.articolo_id,
      case when d.causale = 'reso_cliente' then -1 else 1 end * r.qta as q,
      case when d.causale = 'reso_cliente' then -1 else 1 end * round(r.qta * r.prezzo * (1 - r.sconto / 100), 2) as ric,
      -coalesce((select sum(m.qta * c.costo_unitario) from public.movimenti m join public.movimenti_costi c on c.movimento_id = m.id
                 where m.ddt_riga_id = r.id), 0) as cst
    from public.ddt d join public.ddt_righe r on r.ddt_id = d.id
    where d.azienda_id = az and d.stato in ('confermato','fatturato') and d.data between _dal and _al
      and d.causale in ('vendita','reso_cliente') and r.qta > 0
  ), chiavi as (
    select rg.*,
      case _per
        when 'mese' then to_char(rg.data, 'YYYY-MM')
        when 'cliente' then rg.soggetto_id::text
        when 'articolo' then coalesce(rg.articolo_id::text, '-')
        when 'categoria' then coalesce(a.categoria_id::text, '-')
        else coalesce(s.agente_id::text, '-') end as k,
      case _per
        when 'mese' then to_char(rg.data, 'MM/YYYY')
        when 'cliente' then s.ragione_sociale
        when 'articolo' then coalesce(a.codice || ' – ' || a.descrizione, 'Righe senza articolo')
        when 'categoria' then coalesce(c.nome, 'Senza categoria')
        else coalesce(nullif(btrim(p.nome || ' ' || p.cognome), ''), 'Senza agente') end as e
    from righe rg
    left join public.soggetti s on s.id = rg.soggetto_id
    left join public.articoli a on a.id = rg.articolo_id
    left join public.categorie c on c.id = a.categoria_id
    left join public.profili p on p.id = s.agente_id
  )
  select k, max(e), sum(q), sum(ric),
    case when costi then round(sum(cst), 2) end,
    case when costi then round(sum(ric) - sum(cst), 2) end,
    case when costi and sum(ric) <> 0 then round((sum(ric) - sum(cst)) / sum(ric) * 100, 1) end,
    count(distinct ddt_id)
  from chiavi group by k
  order by case when _per = 'mese' then k end, sum(ric) desc;
end $$;

-- ---------- Analisi magazzino: valore, rotazione, copertura ----------
create function public.analisi_magazzino()
returns table (articolo_id uuid, codice text, descrizione text, um text, qta numeric, costo_medio numeric, valore numeric,
               venduto_90 numeric, copertura_giorni numeric, ultima_vendita date, sotto_scorta boolean, prima_scadenza date)
language plpgsql stable security definer set search_path = '' as $$
declare
  az uuid := public.azienda_corrente();
  costi boolean := public.ha_permesso('vedere_costi');
begin
  if not public.ha_permesso('vedere_analisi') then raise exception 'Permesso negato'; end if;
  return query
  select a.id, a.codice, a.descrizione, a.um, g.q,
    case when costi then public.costo_medio(a.id) end,
    case when costi then round(g.q * public.costo_medio(a.id), 2) end,
    v.q90,
    case when coalesce(v.q90, 0) > 0 then round(g.q / (v.q90 / 90.0), 0) end,
    v.ultima,
    a.scorta_minima > 0 and g.q < a.scorta_minima,
    (select min(l.scadenza) from public.lotti l where l.articolo_id = a.id and l.scadenza is not null
       and (select coalesce(sum(m.qta), 0) from public.movimenti m where m.lotto_id = l.id) > 0)
  from public.articoli a
  cross join lateral (select coalesce(sum(m.qta), 0) as q from public.movimenti m where m.articolo_id = a.id) g
  cross join lateral (
    select sum(-m.qta) filter (where m.data >= current_date - 90) as q90, max(m.data) as ultima
    from public.movimenti m where m.articolo_id = a.id and m.causale = 'vendita') v
  where a.azienda_id = az and a.attivo
  order by 7 desc nulls last, a.codice;
end $$;

-- ---------- Cruscotto ----------
create function public.cruscotto() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  az uuid := public.azienda_corrente();
  gg int;
  out jsonb := '{}';
  m0 date := date_trunc('month', current_date)::date;
  v record;
begin
  if az is null then raise exception 'Utente senza azienda'; end if;
  select giorni_avviso_scadenze into gg from public.aziende where id = az;
  out := out || jsonb_build_object(
    'lotti_in_scadenza', (select count(*) from public.lotti_giacenza lg where lg.azienda_id = az and lg.qta > 0 and lg.scadenza between current_date and current_date + gg),
    'lotti_scaduti', (select count(*) from public.lotti_giacenza lg where lg.azienda_id = az and lg.qta > 0 and lg.scadenza < current_date),
    'sotto_scorta', (select count(*) from public.giacenze_articoli ga where ga.azienda_id = az and ga.scorta_minima > 0 and ga.qta < ga.scorta_minima),
    'giorni_avviso', gg);
  if public.ha_permesso('gestire_vendite') or public.ha_permesso('gestire_magazzino') then
    out := out || jsonb_build_object(
      'ordini_da_evadere', (select count(*) from public.ordini_elenco o where o.azienda_id = az and o.tipo = 'cliente' and o.evasione in ('da_evadere','parziale')),
      'ordini_da_evadere_valore', (select coalesce(sum(o.residuo_valore), 0) from public.ordini_elenco o where o.azienda_id = az and o.tipo = 'cliente' and o.evasione in ('da_evadere','parziale')),
      'ordini_in_ritardo', (select count(*) from public.ordini_elenco o where o.azienda_id = az and o.tipo = 'cliente' and o.evasione in ('da_evadere','parziale') and o.data_consegna < current_date),
      'ddt_bozza', (select count(*) from public.ddt d where d.azienda_id = az and d.stato = 'bozza'),
      'ddt_da_fatturare', (select count(*) from public.ddt d where d.azienda_id = az and d.stato = 'confermato' and d.direzione = 'uscita' and d.causale = 'vendita'));
  end if;
  if public.ha_permesso('vedere_analisi') then
    select sum(a.ricavo) as r, sum(a.margine) as m into v from public.analisi_vendite(m0, current_date, 'mese') a;
    out := out || jsonb_build_object('venduto_mese', coalesce(v.r, 0), 'margine_mese', v.m);
    select sum(a.ricavo) as r, sum(a.margine) as m into v from public.analisi_vendite((m0 - interval '1 month')::date, (m0 - 1), 'mese') a;
    out := out || jsonb_build_object('venduto_mese_prec', coalesce(v.r, 0), 'margine_mese_prec', v.m);
  end if;
  if public.ha_permesso('vedere_scadenzario') then
    out := out || jsonb_build_object(
      'incassi_30', (select coalesce(sum(p.importo), 0) from public.previsionale(current_date, current_date + 30) p where p.tipo = 'incasso' and p.data >= current_date),
      'pagamenti_30', (select coalesce(sum(p.importo), 0) from public.previsionale(current_date, current_date + 30) p where p.tipo = 'pagamento' and p.data >= current_date),
      'incassi_scaduti', (select coalesce(sum(s.importo), 0) from public.scadenze s where s.azienda_id = az and s.tipo = 'incasso' and s.stato = 'aperta' and s.data < current_date and s.ripeti_mesi is null),
      'pagamenti_scaduti', (select coalesce(sum(s.importo), 0) from public.scadenze s where s.azienda_id = az and s.tipo = 'pagamento' and s.stato = 'aperta' and s.data < current_date and s.ripeti_mesi is null));
  end if;
  return out;
end $$;

-- ---------- Creazione azienda (primo accesso) ----------
create function public.crea_azienda(_nome text, _partita_iva text default null, _nome_utente text default '', _cognome text default '')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  az uuid;
begin
  if uid is null then raise exception 'Accesso richiesto'; end if;
  if exists (select 1 from public.profili where id = uid) then raise exception 'Hai già un''azienda'; end if;
  if nullif(btrim(_nome), '') is null then raise exception 'Indica il nome dell''azienda'; end if;
  insert into public.aziende (nome, partita_iva) values (btrim(_nome), nullif(btrim(_partita_iva), '')) returning id into az;
  insert into public.profili (id, azienda_id, nome, cognome, email, ruolo)
    values (uid, az, coalesce(_nome_utente, ''), coalesce(_cognome, ''), (select email from auth.users where id = uid), 'titolare');
  insert into public.permessi_ruolo (azienda_id, ruolo, permesso)
    select az, 'ufficio'::public.ruolo, p from unnest(array['vedere_costi','gestire_anagrafiche','gestire_articoli','gestire_listini','gestire_acquisti',
      'gestire_vendite','gestire_magazzino','vedere_scadenzario','vedere_analisi','gestire_impostazioni']) p
    union all select az, 'magazzino'::public.ruolo, p from unnest(array['gestire_magazzino','gestire_acquisti','gestire_articoli']) p
    union all select az, 'agente'::public.ruolo, p from unnest(array['gestire_vendite','gestire_anagrafiche']) p;
  insert into public.magazzini (azienda_id, nome, predefinito) values (az, 'Magazzino principale', true);
  insert into public.listini (azienda_id, nome, predefinito, ricarico) values (az, 'Listino base', true, 30);
  insert into public.pagamenti (azienda_id, nome, rate, fine_mese) values
    (az, 'Rimessa diretta', '[{"giorni":0,"perc":100}]', false),
    (az, 'Bonifico 30 gg d.f.f.m.', '[{"giorni":30,"perc":100}]', true),
    (az, 'Bonifico 60 gg d.f.f.m.', '[{"giorni":60,"perc":100}]', true),
    (az, 'RiBa 30/60 gg d.f.f.m.', '[{"giorni":30,"perc":50},{"giorni":60,"perc":50}]', true);
  return az;
end $$;

-- Profili: il proprio ruolo non si cambia; il ruolo titolare lo dà o lo toglie solo un titolare.
create function public.controlla_profilo() returns trigger
language plpgsql set search_path = '' as $$
declare io_titolare boolean;
begin
  if auth.uid() is null then return new; end if; -- server (inviti)
  if new.id is distinct from old.id or new.azienda_id is distinct from old.azienda_id then
    raise exception 'Non modificabile';
  end if;
  if new.id = auth.uid() and (new.ruolo is distinct from old.ruolo or new.attivo is distinct from old.attivo) then
    raise exception 'Non puoi cambiare il tuo ruolo o disattivarti';
  end if;
  select ruolo = 'titolare' into io_titolare from public.profili where id = auth.uid();
  if (old.ruolo = 'titolare' or new.ruolo = 'titolare') and new.ruolo is distinct from old.ruolo and not coalesce(io_titolare, false) then
    raise exception 'Solo un titolare gestisce il ruolo titolare';
  end if;
  if old.ruolo = 'titolare' and new.attivo is distinct from old.attivo and not coalesce(io_titolare, false) then
    raise exception 'Solo un titolare disattiva un titolare';
  end if;
  return new;
end $$;
create trigger profili_controllo before update on public.profili for each row execute function public.controlla_profilo();

-- Modifica del proprio nome (chiunque).
create function public.aggiorna_mio_nome(_nome text, _cognome text) returns void
language sql security definer set search_path = '' as $$
  update public.profili set nome = coalesce(_nome, ''), cognome = coalesce(_cognome, '') where id = auth.uid()
$$;

-- ---------- Archivio bolle dei fornitori (privato, per azienda) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('bolle', 'bolle', false, 20971520)
on conflict (id) do nothing;

create policy bolle_leggi on storage.objects for select to authenticated
  using (bucket_id = 'bolle' and (storage.foldername(name))[1] = public.azienda_corrente()::text
         and (public.ha_permesso('gestire_acquisti') or public.ha_permesso('gestire_magazzino')));
create policy bolle_carica on storage.objects for insert to authenticated
  with check (bucket_id = 'bolle' and (storage.foldername(name))[1] = public.azienda_corrente()::text
         and (public.ha_permesso('gestire_acquisti') or public.ha_permesso('gestire_magazzino')));
create policy bolle_togli on storage.objects for delete to authenticated
  using (bucket_id = 'bolle' and (storage.foldername(name))[1] = public.azienda_corrente()::text
         and (public.ha_permesso('gestire_acquisti') or public.ha_permesso('gestire_magazzino')));

-- ---------- Permessi finali ----------
-- anon (non collegato) non tocca niente; le funzioni interne non si chiamano dall'esterno.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
revoke execute on all functions in schema public from authenticated;
grant execute on function
  public.azienda_corrente(), public.ha_permesso(text), public.prezzo_vendita(uuid, uuid, numeric, date),
  public.rettifica_magazzino(uuid, uuid, numeric, text, date, text, numeric, boolean), public.imposta_costo(uuid, numeric),
  public.conferma_ddt(uuid), public.riapri_ddt(uuid, boolean), public.annulla_ddt(uuid),
  public.segna_ddt_esportati(uuid[]), public.riporta_da_fatturare(uuid),
  public.ddt_da_ordine(uuid, jsonb, uuid), public.chiudi_residuo(uuid, boolean), public.stato_ordine(uuid, text),
  public.accetta_offerta(uuid), public.previsionale(date, date), public.analisi_vendite(date, date, text),
  public.analisi_magazzino(), public.cruscotto(), public.crea_azienda(text, text, text, text),
  public.aggiorna_mio_nome(text, text), public.fine_mese(date), public.puo_ddt(text, text), public.puo_ordine(text)
to authenticated;

-- I controlli nei trigger usano stessa_azienda(), che non è chiamabile dagli utenti: girano come proprietario.
alter function public.controlla_destinazione() security definer;
alter function public.controlla_articolo() security definer;
alter function public.controlla_listino_prezzo() security definer;
alter function public.controlla_listino() security definer;
alter function public.controlla_lotto() security definer;
alter function public.controlla_testata() security definer;
alter function public.controlla_riga() security definer;
alter function public.controlla_scadenza() security definer;
