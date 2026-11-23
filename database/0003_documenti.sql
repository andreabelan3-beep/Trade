-- Trade 0003 — offerte, ordini (clienti e fornitori, con stralci), DDT in entrata e in uscita,
-- conferma DDT con carico/scarico per lotto (FEFO), scadenze.

-- ---------- Offerte ----------
create table public.offerte (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  numero text,
  numero_int int,
  anno int,
  data date not null default current_date,
  soggetto_id uuid not null references public.soggetti,
  valida_fino date,
  stato text not null default 'bozza' check (stato in ('bozza','inviata','accettata','rifiutata')),
  pagamento_id uuid references public.pagamenti,
  oggetto text,
  note text,
  note_interne text,
  ordine_id uuid,
  creato_da uuid default auth.uid(),
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index on public.offerte (azienda_id, data desc);

create table public.offerte_righe (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  offerta_id uuid not null references public.offerte on delete cascade,
  posizione int not null default 0,
  articolo_id uuid references public.articoli,
  codice text,
  descrizione text not null default '',
  um text not null default 'PZ',
  qta numeric(14,3) not null default 1 check (qta >= 0),
  prezzo numeric(14,4) not null default 0 check (prezzo >= 0),
  sconto numeric(5,2) not null default 0 check (sconto between 0 and 100),
  iva numeric(5,2) not null default 22
);
create index on public.offerte_righe (offerta_id);

-- ---------- Ordini ----------
create table public.ordini (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  tipo text not null check (tipo in ('cliente','fornitore')),
  numero text,
  numero_int int,
  anno int,
  data date not null default current_date,
  soggetto_id uuid not null references public.soggetti,
  destinazione_id uuid references public.destinazioni,
  riferimento text, -- numero d'ordine del cliente / conferma del fornitore
  data_consegna date,
  stato text not null default 'confermato' check (stato in ('bozza','confermato','chiuso','annullato')),
  pagamento_id uuid references public.pagamenti,
  offerta_id uuid references public.offerte,
  note text,
  note_interne text,
  creato_da uuid default auth.uid(),
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index on public.ordini (azienda_id, tipo, data desc);
alter table public.offerte add constraint offerte_ordine_fk foreign key (ordine_id) references public.ordini;

create table public.ordini_righe (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  ordine_id uuid not null references public.ordini on delete cascade,
  posizione int not null default 0,
  articolo_id uuid references public.articoli,
  codice text,
  descrizione text not null default '',
  um text not null default 'PZ',
  qta numeric(14,3) not null default 1 check (qta >= 0),
  prezzo numeric(14,4) not null default 0 check (prezzo >= 0),
  sconto numeric(5,2) not null default 0 check (sconto between 0 and 100),
  iva numeric(5,2) not null default 22,
  data_consegna date,
  chiusa boolean not null default false -- residuo stralciato: non si evade più
);
create index on public.ordini_righe (ordine_id);

-- ---------- DDT ----------
create table public.ddt (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  direzione text not null check (direzione in ('entrata','uscita')),
  causale text not null check (causale in ('vendita','acquisto','reso_cliente','reso_fornitore','conto_visione','omaggio')),
  numero text, -- uscita: assegnato alla conferma; entrata: numero del fornitore
  numero_int int,
  anno int,
  data date not null default current_date,
  soggetto_id uuid references public.soggetti,
  destinazione_id uuid references public.destinazioni,
  magazzino_id uuid references public.magazzini,
  pagamento_id uuid references public.pagamenti,
  stato text not null default 'bozza' check (stato in ('bozza','confermato','fatturato','annullato')),
  trasporto_cura text not null default 'mittente' check (trasporto_cura in ('mittente','destinatario','vettore')),
  vettore text,
  aspetto_beni text,
  colli int,
  peso numeric(10,2),
  porto text,
  inizio_trasporto timestamptz,
  note text,
  note_interne text,
  file_path text,       -- bolla del fornitore scansionata (bucket privato "bolle")
  lettura_ia jsonb,     -- risultato grezzo della lettura automatica
  danea_esportato_il timestamptz,
  confermato_il timestamptz,
  confermato_da uuid,
  creato_da uuid default auth.uid(),
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  check ((direzione = 'entrata' and causale in ('acquisto','reso_cliente'))
      or (direzione = 'uscita' and causale in ('vendita','reso_fornitore','conto_visione','omaggio')))
);
create index on public.ddt (azienda_id, direzione, data desc);
create unique index ddt_numero_uscita on public.ddt (azienda_id, anno, numero_int) where direzione = 'uscita' and numero_int is not null;
create unique index ddt_numero_entrata on public.ddt (azienda_id, soggetto_id, numero, data)
  where direzione = 'entrata' and stato <> 'annullato' and numero is not null;

create table public.ddt_righe (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  ddt_id uuid not null references public.ddt on delete cascade,
  posizione int not null default 0,
  articolo_id uuid references public.articoli,
  codice text, -- in entrata: il codice del fornitore
  descrizione text not null default '',
  um text not null default 'PZ',
  qta numeric(14,3) not null default 0 check (qta >= 0),
  prezzo numeric(14,4) not null default 0 check (prezzo >= 0),
  sconto numeric(5,2) not null default 0 check (sconto between 0 and 100),
  iva numeric(5,2) not null default 22,
  lotto text,
  scadenza date,
  ordine_riga_id uuid references public.ordini_righe
);
create index on public.ddt_righe (ddt_id);
create index on public.ddt_righe (ordine_riga_id);
alter table public.movimenti add constraint movimenti_ddt_riga_fk foreign key (ddt_riga_id) references public.ddt_righe;

-- ---------- Scadenze (incassi e pagamenti) ----------
create table public.scadenze (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  tipo text not null check (tipo in ('incasso','pagamento')),
  data date not null,
  importo numeric(14,2) not null,
  soggetto_id uuid references public.soggetti,
  descrizione text not null default '',
  origine text not null default 'manuale' check (origine in ('ddt','manuale')),
  ddt_id uuid references public.ddt on delete cascade,
  ripeti_mesi int check (ripeti_mesi between 1 and 12), -- solo manuali: ogni N mesi (affitti, stipendi)
  ripeti_fino date,
  stato text not null default 'aperta' check (stato in ('aperta','saldata')),
  saldata_il date,
  note text,
  creato_il timestamptz not null default now()
);
create index on public.scadenze (azienda_id, data);
create index on public.scadenze (ddt_id);

-- ---------- Trigger: azienda, aggiornamento, numerazione, blocchi ----------
create trigger offerte_azienda before insert on public.offerte for each row execute function public.imposta_azienda();
create trigger offerte_agg before update on public.offerte for each row execute function public.tocca_aggiornato();
create trigger ordini_azienda before insert on public.ordini for each row execute function public.imposta_azienda();
create trigger ordini_agg before update on public.ordini for each row execute function public.tocca_aggiornato();
create trigger ddt_azienda before insert on public.ddt for each row execute function public.imposta_azienda();
create trigger ddt_agg before update on public.ddt for each row execute function public.tocca_aggiornato();
create trigger scadenze_azienda before insert on public.scadenze for each row execute function public.imposta_azienda();

-- Numero di offerte e ordini all'inserimento (OFF / OC / OF), per anno.
create function public.numera_documento() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  new.anno := extract(year from new.data)::int;
  if tg_table_name = 'offerte' then t := 'offerta';
  else t := case new.tipo when 'cliente' then 'ordine_cliente' else 'ordine_fornitore' end;
  end if;
  new.numero_int := public.prossimo_numero(new.azienda_id, t, new.anno);
  new.numero := new.numero_int || '/' || new.anno;
  return new;
end $$;
create trigger offerte_numero before insert on public.offerte for each row execute function public.numera_documento();
create trigger ordini_numero before insert on public.ordini for each row execute function public.numera_documento();

-- Testata: collegamenti nella stessa azienda; numero e stato cambiano solo dalle funzioni.
create function public.controlla_testata() returns trigger
language plpgsql set search_path = '' as $$
declare r jsonb := to_jsonb(new);
begin
  if not public.stessa_azienda('public.soggetti', (r->>'soggetto_id')::uuid, new.azienda_id)
     or not public.stessa_azienda('public.pagamenti', (r->>'pagamento_id')::uuid, new.azienda_id)
     or not public.stessa_azienda('public.destinazioni', (r->>'destinazione_id')::uuid, new.azienda_id)
     or not public.stessa_azienda('public.magazzini', (r->>'magazzino_id')::uuid, new.azienda_id) then
    raise exception 'Collegamento non valido';
  end if;
  if tg_op = 'UPDATE' and coalesce(current_setting('trade.funzione', true), '') <> 'si' then
    if (to_jsonb(old)->>'numero_int') is distinct from (r->>'numero_int')
       or (to_jsonb(old)->>'anno') is distinct from (r->>'anno')
       or (tg_table_name <> 'ddt' and (to_jsonb(old)->>'numero') is distinct from (r->>'numero'))
       or (to_jsonb(old)->>'azienda_id') is distinct from (r->>'azienda_id') then
      raise exception 'Il numero del documento non si modifica';
    end if;
    if tg_table_name = 'ddt' then
      if old.stato <> 'bozza' and (old.stato is distinct from new.stato or old.soggetto_id is distinct from new.soggetto_id
          or old.data is distinct from new.data or old.magazzino_id is distinct from new.magazzino_id
          or old.numero is distinct from new.numero or old.causale is distinct from new.causale
          or old.direzione is distinct from new.direzione) then
        raise exception 'DDT già confermato: riaprilo per modificarlo';
      end if;
      if old.stato = 'bozza' and new.stato <> 'bozza' then
        raise exception 'Usa Conferma per confermare il DDT';
      end if;
      if old.direzione is distinct from new.direzione then raise exception 'Direzione non modificabile'; end if;
    elsif tg_table_name = 'ordini' then
      if old.tipo is distinct from new.tipo then raise exception 'Tipo non modificabile'; end if;
    elsif tg_table_name = 'offerte' then
      if old.stato = 'accettata' then raise exception 'Offerta accettata: non si modifica'; end if;
      if new.stato = 'accettata' or old.ordine_id is distinct from new.ordine_id then
        raise exception 'Usa Accetta per trasformare l''offerta in ordine';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger offerte_controllo before insert or update on public.offerte for each row execute function public.controlla_testata();
create trigger ordini_controllo before insert or update on public.ordini for each row execute function public.controlla_testata();
create trigger ddt_controllo before insert or update on public.ddt for each row execute function public.controlla_testata();

-- Righe: azienda dalla testata, testata modificabile, articolo della stessa azienda.
create function public.controlla_riga() returns trigger
language plpgsql set search_path = '' as $$
declare
  stato_t text;
  az uuid;
  r jsonb;
  bypass boolean := coalesce(current_setting('trade.funzione', true), '') = 'si';
begin
  r := to_jsonb(coalesce(new, old));
  if tg_table_name = 'offerte_righe' then
    select azienda_id, stato into az, stato_t from public.offerte where id = (r->>'offerta_id')::uuid;
    if not bypass and stato_t = 'accettata' then raise exception 'Offerta accettata: righe bloccate'; end if;
  elsif tg_table_name = 'ordini_righe' then
    select azienda_id, stato into az, stato_t from public.ordini where id = (r->>'ordine_id')::uuid;
    if not bypass and stato_t in ('chiuso','annullato') then raise exception 'Ordine chiuso: riaprilo per modificarlo'; end if;
  else
    select azienda_id, stato into az, stato_t from public.ddt where id = (r->>'ddt_id')::uuid;
    if not bypass and stato_t <> 'bozza' then raise exception 'DDT confermato: riaprilo per modificare le righe'; end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  new.azienda_id := az;
  if not public.stessa_azienda('public.articoli', new.articolo_id, az) then raise exception 'Articolo non valido'; end if;
  if tg_table_name = 'ddt_righe' and (to_jsonb(new)->>'ordine_riga_id') is not null
     and not public.stessa_azienda('public.ordini_righe', (to_jsonb(new)->>'ordine_riga_id')::uuid, az) then
    raise exception 'Riga d''ordine non valida';
  end if;
  return new;
end $$;
create trigger offerte_righe_controllo before insert or update or delete on public.offerte_righe for each row execute function public.controlla_riga();
create trigger ordini_righe_controllo before insert or update or delete on public.ordini_righe for each row execute function public.controlla_riga();
create trigger ddt_righe_controllo before insert or update or delete on public.ddt_righe for each row execute function public.controlla_riga();

create function public.controlla_scadenza() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not public.stessa_azienda('public.soggetti', new.soggetto_id, new.azienda_id) then raise exception 'Soggetto non valido'; end if;
  if tg_op = 'INSERT' and new.origine = 'ddt' and coalesce(current_setting('trade.funzione', true), '') <> 'si' then
    raise exception 'Le scadenze dei DDT le crea la conferma del DDT';
  end if;
  if tg_op = 'UPDATE' and (old.ddt_id is distinct from new.ddt_id or old.origine is distinct from new.origine) then
    raise exception 'Collegamento non modificabile';
  end if;
  if new.stato = 'saldata' and new.saldata_il is null then new.saldata_il := current_date; end if;
  if new.stato = 'aperta' then new.saldata_il := null; end if;
  return new;
end $$;
create trigger scadenze_controllo before insert or update on public.scadenze for each row execute function public.controlla_scadenza();

-- ---------- Permessi sui documenti ----------
create function public.puo_ddt(_direzione text, _causale text) returns boolean
language sql stable set search_path = '' as $$
  select case
    when _direzione = 'entrata' and _causale = 'acquisto' then public.ha_permesso('gestire_acquisti') or public.ha_permesso('gestire_magazzino')
    when _direzione = 'uscita' and _causale = 'reso_fornitore' then public.ha_permesso('gestire_acquisti') or public.ha_permesso('gestire_magazzino')
    else public.ha_permesso('gestire_vendite') or public.ha_permesso('gestire_magazzino')
  end
$$;
create function public.puo_ordine(_tipo text) returns boolean
language sql stable set search_path = '' as $$
  select case when _tipo = 'cliente' then public.ha_permesso('gestire_vendite') or public.ha_permesso('gestire_magazzino')
              else public.ha_permesso('gestire_acquisti') or public.ha_permesso('gestire_magazzino') end
$$;

alter table public.offerte enable row level security;
alter table public.offerte_righe enable row level security;
alter table public.ordini enable row level security;
alter table public.ordini_righe enable row level security;
alter table public.ddt enable row level security;
alter table public.ddt_righe enable row level security;
alter table public.scadenze enable row level security;

create policy offerte_tutto on public.offerte for all to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_vendite'))
  with check (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_vendite'));
create policy offerte_righe_tutto on public.offerte_righe for all to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_vendite'))
  with check (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_vendite'));

create policy ordini_tutto on public.ordini for all to authenticated
  using (azienda_id = public.azienda_corrente() and public.puo_ordine(tipo))
  with check (azienda_id = public.azienda_corrente() and public.puo_ordine(tipo));
create policy ordini_righe_tutto on public.ordini_righe for all to authenticated
  using (exists (select 1 from public.ordini o where o.id = ordine_id and o.azienda_id = public.azienda_corrente() and public.puo_ordine(o.tipo)))
  with check (exists (select 1 from public.ordini o where o.id = ordine_id and o.azienda_id = public.azienda_corrente() and public.puo_ordine(o.tipo)));

create policy ddt_tutto on public.ddt for all to authenticated
  using (azienda_id = public.azienda_corrente() and public.puo_ddt(direzione, causale))
  with check (azienda_id = public.azienda_corrente() and public.puo_ddt(direzione, causale));
create policy ddt_righe_tutto on public.ddt_righe for all to authenticated
  using (exists (select 1 from public.ddt d where d.id = ddt_id and d.azienda_id = public.azienda_corrente() and public.puo_ddt(d.direzione, d.causale)))
  with check (exists (select 1 from public.ddt d where d.id = ddt_id and d.azienda_id = public.azienda_corrente() and public.puo_ddt(d.direzione, d.causale)));

create policy scadenze_leggi on public.scadenze for select to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('vedere_scadenzario'));
create policy scadenze_scrivi on public.scadenze for all to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('vedere_scadenzario'))
  with check (azienda_id = public.azienda_corrente() and public.ha_permesso('vedere_scadenzario'));

-- ---------- Viste: evasione ordini (stralci) e totali ----------
create view public.ordini_righe_evasione with (security_invoker = true) as
select r.*,
  coalesce((select sum(dr.qta) from public.ddt_righe dr join public.ddt d on d.id = dr.ddt_id
            where dr.ordine_riga_id = r.id and d.stato in ('confermato','fatturato')), 0) as qta_evasa,
  coalesce((select sum(dr.qta) from public.ddt_righe dr join public.ddt d on d.id = dr.ddt_id
            where dr.ordine_riga_id = r.id and d.stato = 'bozza'), 0) as qta_in_bozza,
  case when r.chiusa then 0 else greatest(r.qta - coalesce((select sum(dr.qta) from public.ddt_righe dr join public.ddt d on d.id = dr.ddt_id
            where dr.ordine_riga_id = r.id and d.stato in ('confermato','fatturato')), 0), 0) end as residuo
from public.ordini_righe r;

create view public.ordini_elenco with (security_invoker = true) as
select o.*, s.ragione_sociale,
  coalesce(t.imponibile, 0) as imponibile,
  coalesce(t.residuo_valore, 0) as residuo_valore,
  case
    when o.stato in ('chiuso','annullato','bozza') then o.stato
    when coalesce(t.residuo_tot, 0) = 0 and coalesce(t.righe, 0) > 0 then 'evaso'
    when coalesce(t.evaso_tot, 0) > 0 then 'parziale'
    else 'da_evadere'
  end as evasione
from public.ordini o
join public.soggetti s on s.id = o.soggetto_id
left join lateral (
  select count(*) as righe,
    sum(round(e.qta * e.prezzo * (1 - e.sconto / 100), 2)) as imponibile,
    sum(round(e.residuo * e.prezzo * (1 - e.sconto / 100), 2)) as residuo_valore,
    sum(e.residuo) as residuo_tot,
    sum(e.qta_evasa) as evaso_tot
  from public.ordini_righe_evasione e where e.ordine_id = o.id
) t on true;

create view public.ddt_elenco with (security_invoker = true) as
select d.*, s.ragione_sociale,
  coalesce((select sum(round(r.qta * r.prezzo * (1 - r.sconto / 100), 2)) from public.ddt_righe r where r.ddt_id = d.id), 0) as imponibile,
  (select count(*) from public.ddt_righe r where r.ddt_id = d.id) as righe
from public.ddt d
left join public.soggetti s on s.id = d.soggetto_id;

create view public.offerte_elenco with (security_invoker = true) as
select o.*, s.ragione_sociale,
  coalesce((select sum(round(r.qta * r.prezzo * (1 - r.sconto / 100), 2)) from public.offerte_righe r where r.offerta_id = o.id), 0) as imponibile
from public.offerte o
join public.soggetti s on s.id = o.soggetto_id;

-- Lotti effettivamente movimentati da ogni riga di DDT (per la stampa e la tracciabilità).
create view public.ddt_righe_lotti with (security_invoker = true) as
select m.ddt_riga_id, m.lotto_id, l.codice as lotto, l.scadenza, abs(m.qta) as qta
from public.movimenti m left join public.lotti l on l.id = m.lotto_id
where m.ddt_riga_id is not null;

-- ---------- Totale documento (imponibile per aliquota + IVA arrotondata) ----------
create function public.totale_ddt(_id uuid) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(imp + round(imp * iva / 100, 2)), 0) from (
    select r.iva, sum(round(r.qta * r.prezzo * (1 - r.sconto / 100), 2)) as imp
    from public.ddt_righe r where r.ddt_id = _id group by r.iva) t
$$;
revoke execute on function public.totale_ddt(uuid) from public, anon, authenticated;

create function public.fine_mese(_d date) returns date
language sql immutable set search_path = '' as $$
  select (date_trunc('month', _d) + interval '1 month - 1 day')::date
$$;

-- Scadenze di un DDT di vendita/acquisto: fattura differita a fine mese del DDT, poi le rate del pagamento.
create function public.genera_scadenze_ddt(_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d record;
  pag record;
  tot numeric;
  base date;
  rata jsonb;
  n int;
  i int := 0;
  fatto numeric := 0;
  imp numeric;
  quando date;
begin
  select * into d from public.ddt where id = _id;
  if d.causale not in ('vendita','acquisto') or d.soggetto_id is null then return; end if;
  delete from public.scadenze where ddt_id = _id and stato = 'aperta';
  if exists (select 1 from public.scadenze where ddt_id = _id) then return; end if; -- già incassate: non si rigenerano
  tot := public.totale_ddt(_id);
  if tot = 0 then return; end if;
  select p.* into pag from public.pagamenti p
    where p.id = coalesce(d.pagamento_id, (select s.pagamento_id from public.soggetti s where s.id = d.soggetto_id));
  base := public.fine_mese(d.data);
  perform set_config('trade.funzione', 'si', true);
  if pag.id is null then
    insert into public.scadenze (azienda_id, tipo, data, importo, soggetto_id, descrizione, origine, ddt_id)
      values (d.azienda_id, case when d.causale = 'vendita' then 'incasso' else 'pagamento' end, base, tot, d.soggetto_id,
              'DDT ' || coalesce(d.numero, '') || ' del ' || to_char(d.data, 'DD/MM/YYYY'), 'ddt', _id);
  else
    n := jsonb_array_length(pag.rate);
    for rata in select * from jsonb_array_elements(pag.rate) loop
      i := i + 1;
      imp := case when i = n then tot - fatto else round(tot * (rata->>'perc')::numeric / 100, 2) end;
      fatto := fatto + imp;
      quando := base + coalesce((rata->>'giorni')::int, 0);
      if pag.fine_mese then quando := public.fine_mese(quando); end if;
      insert into public.scadenze (azienda_id, tipo, data, importo, soggetto_id, descrizione, origine, ddt_id)
        values (d.azienda_id, case when d.causale = 'vendita' then 'incasso' else 'pagamento' end, quando, imp, d.soggetto_id,
                'DDT ' || coalesce(d.numero, '') || ' del ' || to_char(d.data, 'DD/MM/YYYY') || case when n > 1 then ' – rata ' || i || '/' || n else '' end,
                'ddt', _id);
    end loop;
  end if;
  perform set_config('trade.funzione', '', true);
end $$;
revoke execute on function public.genera_scadenze_ddt(uuid) from public, anon, authenticated;

-- ---------- Conferma DDT: numero, lotti, movimenti, costi, scadenze ----------
create function public.conferma_ddt(_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  az uuid := public.azienda_corrente();
  d record;
  r record;
  art record;
  lid uuid;
  mid uuid;
  costo numeric;
  rem numeric;
  disp numeric;
  l record;
  prendi numeric;
  neg boolean;
  segno int;
begin
  select * into d from public.ddt where id = _id and azienda_id = az for update;
  if not found then raise exception 'DDT non trovato'; end if;
  if not public.puo_ddt(d.direzione, d.causale) then raise exception 'Permesso negato'; end if;
  if d.stato <> 'bozza' then raise exception 'Il DDT non è in bozza'; end if;
  if d.soggetto_id is null then raise exception 'Manca il cliente/fornitore'; end if;
  if not exists (select 1 from public.ddt_righe where ddt_id = _id and qta > 0) then raise exception 'Il DDT non ha righe con quantità'; end if;
  if exists (select 1 from public.ddt_righe where ddt_id = _id and qta > 0 and articolo_id is null) then
    raise exception 'Ci sono righe con quantità ma senza articolo: abbinale o metti quantità 0';
  end if;
  select giacenza_negativa into neg from public.aziende where id = az;
  if d.magazzino_id is null then
    select id into d.magazzino_id from public.magazzini where azienda_id = az and predefinito;
    if d.magazzino_id is null then raise exception 'Nessun magazzino predefinito'; end if;
  end if;
  segno := case when d.direzione = 'entrata' then 1 else -1 end;

  perform set_config('trade.funzione', 'si', true);
  if d.direzione = 'uscita' and d.numero_int is null then
    d.anno := extract(year from d.data)::int;
    d.numero_int := public.prossimo_numero(az, 'ddt', d.anno);
    d.numero := d.numero_int || '/' || d.anno;
  elsif d.direzione = 'entrata' then
    if nullif(btrim(d.numero), '') is null then raise exception 'Indica il numero del DDT del fornitore'; end if;
    d.anno := extract(year from d.data)::int;
  end if;

  for r in select * from public.ddt_righe where ddt_id = _id and qta > 0 and articolo_id is not null order by posizione loop
    select * into art from public.articoli where id = r.articolo_id;
    lid := null;
    if d.direzione = 'entrata' then
      if art.gestione_lotti and nullif(btrim(r.lotto), '') is null then
        raise exception 'Riga "%": manca il lotto', art.codice;
      end if;
      if art.gestione_scadenze and r.scadenza is null then
        raise exception 'Riga "%": manca la data di scadenza', art.codice;
      end if;
      if nullif(btrim(r.lotto), '') is not null then
        insert into public.lotti (azienda_id, articolo_id, codice, scadenza) values (az, r.articolo_id, btrim(r.lotto), r.scadenza)
          on conflict (articolo_id, codice) do update set scadenza = coalesce(public.lotti.scadenza, excluded.scadenza)
          returning id into lid;
      end if;
      costo := case when d.causale = 'acquisto' then round(r.prezzo * (1 - r.sconto / 100), 4) else public.costo_medio(r.articolo_id) end;
      insert into public.movimenti (azienda_id, data, articolo_id, magazzino_id, lotto_id, qta, causale, ddt_riga_id)
        values (az, d.data, r.articolo_id, d.magazzino_id, lid, r.qta, d.causale, r.id) returning id into mid;
      insert into public.movimenti_costi (movimento_id, azienda_id, costo_unitario) values (mid, az, costo);
      if d.causale = 'acquisto' and costo > 0 then
        insert into public.articoli_costi (articolo_id, azienda_id, costo_ultimo) values (r.articolo_id, az, costo)
          on conflict (articolo_id) do update set costo_ultimo = excluded.costo_ultimo, aggiornato_il = now();
        if nullif(btrim(r.codice), '') is not null then
          insert into public.codici_fornitore (azienda_id, articolo_id, fornitore_id, codice, descrizione, ultimo_prezzo)
            values (az, r.articolo_id, d.soggetto_id, btrim(r.codice), r.descrizione, costo)
            on conflict (fornitore_id, codice) do update
              set articolo_id = excluded.articolo_id, ultimo_prezzo = excluded.ultimo_prezzo, aggiornato_il = now();
        end if;
      end if;
    else
      costo := public.costo_medio(r.articolo_id);
      if nullif(btrim(r.lotto), '') is not null then
        select id into lid from public.lotti where articolo_id = r.articolo_id and codice = btrim(r.lotto);
        if lid is null then raise exception 'Riga "%": lotto % inesistente', art.codice, r.lotto; end if;
        select coalesce(sum(qta), 0) into disp from public.movimenti where lotto_id = lid and magazzino_id = d.magazzino_id;
        if not neg and disp < r.qta then
          raise exception 'Riga "%": nel lotto % ci sono solo %', art.codice, r.lotto, disp;
        end if;
        insert into public.movimenti (azienda_id, data, articolo_id, magazzino_id, lotto_id, qta, causale, ddt_riga_id)
          values (az, d.data, r.articolo_id, d.magazzino_id, lid, -r.qta, d.causale, r.id) returning id into mid;
        insert into public.movimenti_costi (movimento_id, azienda_id, costo_unitario) values (mid, az, costo);
      elsif art.gestione_lotti then
        -- FEFO: prima i lotti che scadono prima
        rem := r.qta;
        for l in
          select m.lotto_id, sum(m.qta) as q from public.movimenti m join public.lotti lo on lo.id = m.lotto_id
          where m.articolo_id = r.articolo_id and m.magazzino_id = d.magazzino_id and m.lotto_id is not null
          group by m.lotto_id, lo.scadenza, lo.creato_il having sum(m.qta) > 0
          order by lo.scadenza nulls last, lo.creato_il
        loop
          exit when rem <= 0;
          prendi := least(rem, l.q);
          insert into public.movimenti (azienda_id, data, articolo_id, magazzino_id, lotto_id, qta, causale, ddt_riga_id)
            values (az, d.data, r.articolo_id, d.magazzino_id, l.lotto_id, -prendi, d.causale, r.id) returning id into mid;
          insert into public.movimenti_costi (movimento_id, azienda_id, costo_unitario) values (mid, az, costo);
          rem := rem - prendi;
        end loop;
        if rem > 0 then
          if not neg then raise exception 'Riga "%": giacenza insufficiente (mancano %)', art.codice, rem; end if;
          insert into public.movimenti (azienda_id, data, articolo_id, magazzino_id, qta, causale, ddt_riga_id)
            values (az, d.data, r.articolo_id, d.magazzino_id, -rem, d.causale, r.id) returning id into mid;
          insert into public.movimenti_costi (movimento_id, azienda_id, costo_unitario) values (mid, az, costo);
        end if;
      else
        select coalesce(sum(qta), 0) into disp from public.movimenti where articolo_id = r.articolo_id and magazzino_id = d.magazzino_id;
        if not neg and disp < r.qta then
          raise exception 'Riga "%": giacenza insufficiente (disponibili %)', art.codice, disp;
        end if;
        insert into public.movimenti (azienda_id, data, articolo_id, magazzino_id, qta, causale, ddt_riga_id)
          values (az, d.data, r.articolo_id, d.magazzino_id, -r.qta, d.causale, r.id) returning id into mid;
        insert into public.movimenti_costi (movimento_id, azienda_id, costo_unitario) values (mid, az, costo);
      end if;
    end if;
  end loop;

  update public.ddt set stato = 'confermato', numero = d.numero, numero_int = d.numero_int, anno = d.anno,
    magazzino_id = d.magazzino_id, confermato_il = now(), confermato_da = auth.uid()
    where id = _id;
  perform set_config('trade.funzione', '', true);
  perform public.genera_scadenze_ddt(_id);
  return d.numero;
end $$;

-- Riapre un DDT confermato (non fatturato): toglie i movimenti e le scadenze aperte. Il numero resta.
create function public.riapri_ddt(_id uuid, _annulla boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare
  az uuid := public.azienda_corrente();
  d record;
  neg boolean;
  bad record;
begin
  select * into d from public.ddt where id = _id and azienda_id = az for update;
  if not found then raise exception 'DDT non trovato'; end if;
  if not public.puo_ddt(d.direzione, d.causale) then raise exception 'Permesso negato'; end if;
  if d.stato = 'fatturato' then raise exception 'DDT già esportato in fattura: prima riportalo "da fatturare"'; end if;
  if d.stato = 'annullato' then raise exception 'DDT annullato'; end if;
  if exists (select 1 from public.scadenze where ddt_id = _id and stato = 'saldata') then
    raise exception 'Il DDT ha scadenze già saldate';
  end if;
  select giacenza_negativa into neg from public.aziende where id = az;
  delete from public.movimenti where ddt_riga_id in (select id from public.ddt_righe where ddt_id = _id);
  delete from public.scadenze where ddt_id = _id;
  if not neg and d.direzione = 'entrata' then
    select l.codice, a.codice as art into bad from public.lotti l join public.articoli a on a.id = l.articolo_id
      where l.id in (select lo.id from public.lotti lo join public.ddt_righe r on r.articolo_id = lo.articolo_id and lo.codice = btrim(r.lotto) where r.ddt_id = _id)
        and (select coalesce(sum(m.qta), 0) from public.movimenti m where m.lotto_id = l.id) < 0
      limit 1;
    if found then raise exception 'Il lotto % dell''articolo % è già stato venduto: non si può togliere il carico', bad.codice, bad.art; end if;
  end if;
  perform set_config('trade.funzione', 'si', true);
  update public.ddt set stato = case when _annulla then 'annullato' else 'bozza' end, confermato_il = null, confermato_da = null where id = _id;
  perform set_config('trade.funzione', '', true);
end $$;

create function public.annulla_ddt(_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare d record;
begin
  select * into d from public.ddt where id = _id and azienda_id = public.azienda_corrente() for update;
  if not found then raise exception 'DDT non trovato'; end if;
  if not public.puo_ddt(d.direzione, d.causale) then raise exception 'Permesso negato'; end if;
  if d.stato = 'bozza' then
    perform set_config('trade.funzione', 'si', true);
    update public.ddt set stato = 'annullato' where id = _id;
    perform set_config('trade.funzione', '', true);
  else
    perform public.riapri_ddt(_id, true);
  end if;
end $$;

-- Danea: i DDT esportati diventano "fatturato" (si possono riportare indietro).
create function public.segna_ddt_esportati(_ids uuid[]) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.ha_permesso('gestire_vendite') then raise exception 'Permesso negato'; end if;
  perform set_config('trade.funzione', 'si', true);
  update public.ddt set stato = 'fatturato', danea_esportato_il = now()
    where id = any(_ids) and azienda_id = public.azienda_corrente() and stato = 'confermato' and direzione = 'uscita';
  get diagnostics n = row_count;
  perform set_config('trade.funzione', '', true);
  return n;
end $$;

create function public.riporta_da_fatturare(_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.ha_permesso('gestire_vendite') then raise exception 'Permesso negato'; end if;
  perform set_config('trade.funzione', 'si', true);
  update public.ddt set stato = 'confermato', danea_esportato_il = null
    where id = _id and azienda_id = public.azienda_corrente() and stato = 'fatturato';
  perform set_config('trade.funzione', '', true);
end $$;

-- ---------- Da ordine a DDT (evasione parziale = stralcio) ----------
-- _righe: [{"riga_id": "...", "qta": 3}] oppure null = tutti i residui. _ddt: aggiunge a una bozza esistente.
create function public.ddt_da_ordine(_ordine uuid, _righe jsonb default null, _ddt uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  az uuid := public.azienda_corrente();
  o record;
  d record;
  r record;
  q numeric;
  pos int;
  n int := 0;
  did uuid := _ddt;
begin
  select * into o from public.ordini where id = _ordine and azienda_id = az;
  if not found then raise exception 'Ordine non trovato'; end if;
  if not public.puo_ordine(o.tipo) then raise exception 'Permesso negato'; end if;
  if o.stato <> 'confermato' then raise exception 'L''ordine non è aperto'; end if;
  if did is null then
    insert into public.ddt (azienda_id, direzione, causale, soggetto_id, destinazione_id, pagamento_id, magazzino_id, note)
      values (az, case when o.tipo = 'cliente' then 'uscita' else 'entrata' end,
              case when o.tipo = 'cliente' then 'vendita' else 'acquisto' end,
              o.soggetto_id, o.destinazione_id, o.pagamento_id,
              (select id from public.magazzini where azienda_id = az and predefinito),
              case when o.riferimento is not null then 'Vs. ordine ' || o.riferimento else 'Ns. ordine ' || o.numero end)
      returning id into did;
  else
    select * into d from public.ddt where id = did and azienda_id = az;
    if not found or d.stato <> 'bozza' then raise exception 'Il DDT scelto non è una bozza'; end if;
    if d.soggetto_id <> o.soggetto_id then raise exception 'Il DDT è di un altro cliente/fornitore'; end if;
  end if;
  select coalesce(max(posizione), 0) into pos from public.ddt_righe where ddt_id = did;
  for r in select * from public.ordini_righe_evasione where ordine_id = _ordine order by posizione loop
    q := null;
    if _righe is null then
      q := r.residuo - r.qta_in_bozza;
    else
      select (x->>'qta')::numeric into q from jsonb_array_elements(_righe) x where (x->>'riga_id')::uuid = r.id;
    end if;
    continue when q is null or q <= 0;
    pos := pos + 1;
    n := n + 1;
    insert into public.ddt_righe (azienda_id, ddt_id, posizione, articolo_id, codice, descrizione, um, qta, prezzo, sconto, iva, ordine_riga_id)
      values (az, did, pos, r.articolo_id, r.codice, r.descrizione, r.um, q, r.prezzo, r.sconto, r.iva, r.id);
  end loop;
  if n = 0 then raise exception 'Niente da evadere'; end if;
  return did;
end $$;

-- Stralcio: chiude il residuo di una riga (o di tutto l'ordine) senza evaderlo.
create function public.chiudi_residuo(_riga uuid, _chiusa boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  select ord.* into o from public.ordini ord join public.ordini_righe r on r.ordine_id = ord.id
    where r.id = _riga and ord.azienda_id = public.azienda_corrente();
  if not found then raise exception 'Riga non trovata'; end if;
  if not public.puo_ordine(o.tipo) then raise exception 'Permesso negato'; end if;
  perform set_config('trade.funzione', 'si', true);
  update public.ordini_righe set chiusa = _chiusa where id = _riga;
  perform set_config('trade.funzione', '', true);
end $$;

create function public.stato_ordine(_id uuid, _stato text) returns void
language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  select * into o from public.ordini where id = _id and azienda_id = public.azienda_corrente() for update;
  if not found then raise exception 'Ordine non trovato'; end if;
  if not public.puo_ordine(o.tipo) then raise exception 'Permesso negato'; end if;
  if _stato not in ('bozza','confermato','chiuso','annullato') then raise exception 'Stato non valido'; end if;
  if _stato = 'annullato' and exists (select 1 from public.ordini_righe_evasione where ordine_id = _id and qta_evasa > 0) then
    raise exception 'Ordine già evaso in parte: chiudilo invece di annullarlo';
  end if;
  update public.ordini set stato = _stato where id = _id;
end $$;

-- ---------- Da offerta a ordine ----------
create function public.accetta_offerta(_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  az uuid := public.azienda_corrente();
  o record;
  oid uuid;
begin
  if not public.ha_permesso('gestire_vendite') then raise exception 'Permesso negato'; end if;
  select * into o from public.offerte where id = _id and azienda_id = az for update;
  if not found then raise exception 'Offerta non trovata'; end if;
  if o.stato = 'accettata' then raise exception 'Offerta già accettata'; end if;
  insert into public.ordini (azienda_id, tipo, soggetto_id, pagamento_id, offerta_id, riferimento, note)
    values (az, 'cliente', o.soggetto_id, o.pagamento_id, o.id, 'Offerta ' || o.numero, o.note)
    returning id into oid;
  insert into public.ordini_righe (azienda_id, ordine_id, posizione, articolo_id, codice, descrizione, um, qta, prezzo, sconto, iva)
    select az, oid, posizione, articolo_id, codice, descrizione, um, qta, prezzo, sconto, iva
    from public.offerte_righe where offerta_id = _id;
  perform set_config('trade.funzione', 'si', true);
  update public.offerte set stato = 'accettata', ordine_id = oid where id = _id;
  perform set_config('trade.funzione', '', true);
  return oid;
end $$;

-- ---------- Previsionale incassi e pagamenti ----------
-- Scadenze aperte (anche ricorrenti espanse) + residui degli ordini aperti (valore stimato alla data di consegna,
-- fine mese + rate del pagamento). certezza: 'scadenza' (da DDT o manuale) / 'ordine' (stima).
create function public.previsionale(_dal date, _al date)
returns table (data date, tipo text, importo numeric, certezza text, soggetto text, descrizione text, scadenza_id uuid, ordine_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare az uuid := public.azienda_corrente();
begin
  if not public.ha_permesso('vedere_scadenzario') then raise exception 'Permesso negato'; end if;
  return query
  select g.d::date, s.tipo, s.importo, 'scadenza'::text, so.ragione_sociale, s.descrizione, s.id, null::uuid
  from public.scadenze s
  left join public.soggetti so on so.id = s.soggetto_id
  cross join lateral (
    select gs as d from generate_series(s.data::timestamp,
      case when s.ripeti_mesi is null then s.data::timestamp else least(coalesce(s.ripeti_fino, _al), _al)::timestamp end,
      case when s.ripeti_mesi is null then interval '1 day' else make_interval(months => s.ripeti_mesi) end) gs
  ) g
  where s.azienda_id = az and s.stato = 'aperta' and g.d::date <= _al and (g.d::date >= _dal or (s.ripeti_mesi is null and s.data < _dal))
  union all
  select x.quando, x.tipo, x.importo, 'ordine'::text, x.ragione_sociale, x.descrizione, null::uuid, x.oid
  from (
    select (public.fine_mese(coalesce(r.data_consegna, o.data_consegna, current_date)) + coalesce((p.rate->0->>'giorni')::int, 30))::date as quando,
      case when o.tipo = 'cliente' then 'incasso' else 'pagamento' end as tipo,
      round(sum(r.residuo * r.prezzo * (1 - r.sconto / 100) * (1 + r.iva / 100)), 2) as importo,
      so.ragione_sociale, 'Ordine ' || o.numero || ' (residuo)' as descrizione, o.id as oid
    from public.ordini o
    join public.ordini_righe_evasione r on r.ordine_id = o.id and r.residuo > 0
    join public.soggetti so on so.id = o.soggetto_id
    left join public.pagamenti p on p.id = coalesce(o.pagamento_id, so.pagamento_id)
    where o.azienda_id = az and o.stato = 'confermato'
    group by 1, 2, 4, 5, 6
  ) x
  where x.quando between _dal and _al
  order by 1;
end $$;

-- Si cancellano solo le bozze mai numerate (i numeri dei DDT non devono avere buchi).
create function public.blocca_cancellazione() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'ddt' and (old.stato <> 'bozza' or (old.direzione = 'uscita' and old.numero_int is not null)) then
    raise exception 'Si cancellano solo i DDT in bozza mai confermati: usa Annulla';
  end if;
  if tg_table_name = 'offerte' and old.stato = 'accettata' then
    raise exception 'Offerta accettata: non si cancella';
  end if;
  if tg_table_name = 'ordini' and exists (select 1 from public.ddt_righe dr join public.ordini_righe r on r.id = dr.ordine_riga_id where r.ordine_id = old.id) then
    raise exception 'Ordine con DDT collegati: chiudilo invece di cancellarlo';
  end if;
  return old;
end $$;
create trigger ddt_cancella before delete on public.ddt for each row execute function public.blocca_cancellazione();
create trigger offerte_cancella before delete on public.offerte for each row execute function public.blocca_cancellazione();
create trigger ordini_cancella before delete on public.ordini for each row execute function public.blocca_cancellazione();
