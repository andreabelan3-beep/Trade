-- Trade 0002 — articoli, costi, codici fornitore, listini, magazzini, lotti, movimenti.

create table public.categorie (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  nome text not null check (btrim(nome) <> ''),
  parent_id uuid references public.categorie,
  -- ricarico % sul costo quando un articolo non è in nessun listino
  ricarico numeric(7,2)
);
create index on public.categorie (azienda_id);

create table public.articoli (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  codice text not null check (btrim(codice) <> ''),
  descrizione text not null check (btrim(descrizione) <> ''),
  um text not null default 'PZ',
  categoria_id uuid references public.categorie,
  marca text,
  ean text,
  iva numeric(5,2) not null default 22,
  gestione_lotti boolean not null default false,
  gestione_scadenze boolean not null default false,
  scorta_minima numeric(14,3) not null default 0,
  ricarico numeric(7,2),
  fornitore_id uuid references public.soggetti,
  note text,
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  unique (azienda_id, codice)
);
create index articoli_descr_trgm on public.articoli using gin (descrizione extensions.gin_trgm_ops);
create index articoli_codice_trgm on public.articoli using gin (codice extensions.gin_trgm_ops);
create index on public.articoli (azienda_id, ean);

-- Costi separati dagli articoli: li legge solo chi ha vedere_costi.
create table public.articoli_costi (
  articolo_id uuid primary key references public.articoli on delete cascade,
  azienda_id uuid not null references public.aziende,
  costo_ultimo numeric(14,4) not null default 0 check (costo_ultimo >= 0),
  aggiornato_il timestamptz not null default now()
);

-- Codice e ultimo prezzo netto di un articolo presso un fornitore (abbinamento bolle).
create table public.codici_fornitore (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  articolo_id uuid not null references public.articoli on delete cascade,
  fornitore_id uuid not null references public.soggetti,
  codice text not null,
  descrizione text,
  ultimo_prezzo numeric(14,4),
  aggiornato_il timestamptz not null default now(),
  unique (fornitore_id, codice)
);
create index on public.codici_fornitore (articolo_id);

-- ---------- Listini ----------
-- Un listino generale (predefinito o assegnato al cliente) o dedicato a un solo cliente.
create table public.listini (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  nome text not null check (btrim(nome) <> ''),
  soggetto_id uuid references public.soggetti, -- valorizzato = listino dedicato a quel cliente
  predefinito boolean not null default false,
  ricarico numeric(7,2), -- articoli non in elenco: costo × (1 + ricarico%)
  valido_dal date,
  valido_al date,
  attivo boolean not null default true,
  note text,
  creato_il timestamptz not null default now()
);
create unique index listini_un_predefinito on public.listini (azienda_id) where predefinito;
create index on public.listini (soggetto_id);
alter table public.soggetti add constraint soggetti_listino_fk foreign key (listino_id) references public.listini;

create table public.listini_prezzi (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  listino_id uuid not null references public.listini on delete cascade,
  articolo_id uuid not null references public.articoli on delete cascade,
  prezzo numeric(14,4) not null check (prezzo >= 0),
  sconto numeric(5,2) not null default 0 check (sconto between 0 and 100),
  qta_minima numeric(14,3) not null default 0,
  aggiornato_il timestamptz not null default now(),
  unique (listino_id, articolo_id, qta_minima)
);
create index on public.listini_prezzi (articolo_id);

-- ---------- Magazzino ----------
create table public.magazzini (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  nome text not null check (btrim(nome) <> ''),
  predefinito boolean not null default false
);
create unique index magazzini_un_predefinito on public.magazzini (azienda_id) where predefinito;

create table public.lotti (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  articolo_id uuid not null references public.articoli,
  codice text not null check (btrim(codice) <> ''),
  scadenza date,
  creato_il timestamptz not null default now(),
  unique (articolo_id, codice)
);
create index on public.lotti (azienda_id, scadenza);

-- Movimenti: qta con segno (+ carico, − scarico). Scritti solo dalle funzioni del database.
create table public.movimenti (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  data date not null default current_date,
  articolo_id uuid not null references public.articoli,
  magazzino_id uuid not null references public.magazzini,
  lotto_id uuid references public.lotti,
  qta numeric(14,3) not null check (qta <> 0),
  causale text not null check (causale in (
    'acquisto', 'vendita', 'reso_cliente', 'reso_fornitore', 'conto_visione', 'omaggio',
    'rettifica', 'inventario')),
  ddt_riga_id uuid, -- FK in 0003
  nota text,
  creato_da uuid default auth.uid(),
  creato_il timestamptz not null default now()
);
create index on public.movimenti (azienda_id, articolo_id);
create index on public.movimenti (lotto_id);
create index on public.movimenti (ddt_riga_id);

create table public.movimenti_costi (
  movimento_id uuid primary key references public.movimenti on delete cascade,
  azienda_id uuid not null references public.aziende,
  costo_unitario numeric(14,4) not null default 0
);

-- Trigger azienda
create trigger categorie_azienda before insert on public.categorie for each row execute function public.imposta_azienda();
create trigger articoli_azienda before insert on public.articoli for each row execute function public.imposta_azienda();
create trigger articoli_agg before update on public.articoli for each row execute function public.tocca_aggiornato();
create trigger codici_fornitore_azienda before insert on public.codici_fornitore for each row execute function public.imposta_azienda();
create trigger listini_azienda before insert on public.listini for each row execute function public.imposta_azienda();
create trigger listini_prezzi_azienda before insert on public.listini_prezzi for each row execute function public.imposta_azienda();
create trigger listini_prezzi_agg before update on public.listini_prezzi for each row execute function public.tocca_aggiornato();
create trigger magazzini_azienda before insert on public.magazzini for each row execute function public.imposta_azienda();
create trigger lotti_azienda before insert on public.lotti for each row execute function public.imposta_azienda();

-- Collegamenti sempre dentro la stessa azienda
create function public.stessa_azienda(_tabella regclass, _id uuid, _azienda uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare r boolean;
begin
  if _id is null then return true; end if;
  execute format('select exists(select 1 from %s where id = $1 and azienda_id = $2)', _tabella)
    into r using _id, _azienda;
  return r;
end $$;
revoke execute on function public.stessa_azienda(regclass, uuid, uuid) from public, anon, authenticated;

create function public.controlla_articolo() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not public.stessa_azienda('public.categorie', new.categoria_id, new.azienda_id)
     or not public.stessa_azienda('public.soggetti', new.fornitore_id, new.azienda_id) then
    raise exception 'Collegamento non valido';
  end if;
  return new;
end $$;
create trigger articoli_controllo before insert or update on public.articoli for each row execute function public.controlla_articolo();

create function public.controlla_listino_prezzo() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not public.stessa_azienda('public.listini', new.listino_id, new.azienda_id)
     or not public.stessa_azienda('public.articoli', new.articolo_id, new.azienda_id) then
    raise exception 'Collegamento non valido';
  end if;
  return new;
end $$;
create trigger listini_prezzi_controllo before insert or update on public.listini_prezzi for each row execute function public.controlla_listino_prezzo();

create function public.controlla_listino() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not public.stessa_azienda('public.soggetti', new.soggetto_id, new.azienda_id) then
    raise exception 'Cliente non valido';
  end if;
  if new.soggetto_id is not null and new.predefinito then
    raise exception 'Un listino dedicato a un cliente non può essere il predefinito';
  end if;
  return new;
end $$;
create trigger listini_controllo before insert or update on public.listini for each row execute function public.controlla_listino();

create function public.controlla_lotto() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not public.stessa_azienda('public.articoli', new.articolo_id, new.azienda_id) then
    raise exception 'Articolo non valido';
  end if;
  return new;
end $$;
create trigger lotti_controllo before insert or update on public.lotti for each row execute function public.controlla_lotto();

-- ---------- RLS ----------
alter table public.categorie enable row level security;
alter table public.articoli enable row level security;
alter table public.articoli_costi enable row level security;
alter table public.codici_fornitore enable row level security;
alter table public.listini enable row level security;
alter table public.listini_prezzi enable row level security;
alter table public.magazzini enable row level security;
alter table public.lotti enable row level security;
alter table public.movimenti enable row level security;
alter table public.movimenti_costi enable row level security;

create policy categorie_leggi on public.categorie for select to authenticated using (azienda_id = public.azienda_corrente());
create policy categorie_scrivi on public.categorie for all to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_articoli'))
  with check (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_articoli'));

create policy articoli_leggi on public.articoli for select to authenticated using (azienda_id = public.azienda_corrente());
create policy articoli_nuovo on public.articoli for insert to authenticated
  with check (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_articoli'));
create policy articoli_modifica on public.articoli for update to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_articoli'))
  with check (azienda_id = public.azienda_corrente());

create policy costi_leggi on public.articoli_costi for select to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('vedere_costi'));

create policy codici_fornitore_leggi on public.codici_fornitore for select to authenticated
  using (azienda_id = public.azienda_corrente() and (public.ha_permesso('vedere_costi') or public.ha_permesso('gestire_acquisti')));
create policy codici_fornitore_scrivi on public.codici_fornitore for all to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_articoli'))
  with check (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_articoli'));

create policy listini_leggi on public.listini for select to authenticated using (azienda_id = public.azienda_corrente());
create policy listini_scrivi on public.listini for all to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_listini'))
  with check (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_listini'));
create policy listini_prezzi_leggi on public.listini_prezzi for select to authenticated using (azienda_id = public.azienda_corrente());
create policy listini_prezzi_scrivi on public.listini_prezzi for all to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_listini'))
  with check (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_listini'));

create policy magazzini_leggi on public.magazzini for select to authenticated using (azienda_id = public.azienda_corrente());
create policy magazzini_scrivi on public.magazzini for all to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_impostazioni'))
  with check (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_impostazioni'));

create policy lotti_leggi on public.lotti for select to authenticated using (azienda_id = public.azienda_corrente());
create policy lotti_modifica on public.lotti for update to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_magazzino'))
  with check (azienda_id = public.azienda_corrente());

create policy movimenti_leggi on public.movimenti for select to authenticated using (azienda_id = public.azienda_corrente());
create policy movimenti_costi_leggi on public.movimenti_costi for select to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('vedere_costi'));

revoke insert, update, delete on public.articoli_costi, public.movimenti, public.movimenti_costi from authenticated;
revoke insert, delete on public.lotti from authenticated;
revoke delete on public.articoli from authenticated;

-- ---------- Giacenze ----------
create view public.giacenze with (security_invoker = true) as
select m.azienda_id, m.articolo_id, m.magazzino_id, m.lotto_id, sum(m.qta) as qta
from public.movimenti m
group by m.azienda_id, m.articolo_id, m.magazzino_id, m.lotto_id
having sum(m.qta) <> 0;

create view public.giacenze_articoli with (security_invoker = true) as
select a.azienda_id, a.id as articolo_id, a.codice, a.descrizione, a.um, a.scorta_minima, a.categoria_id,
  coalesce((select sum(m.qta) from public.movimenti m where m.articolo_id = a.id), 0) as qta,
  (select min(l.scadenza) from public.lotti l
     where l.articolo_id = a.id and l.scadenza is not null
       and (select coalesce(sum(m.qta),0) from public.movimenti m where m.lotto_id = l.id) > 0) as prima_scadenza
from public.articoli a
where a.attivo;

create view public.lotti_giacenza with (security_invoker = true) as
select l.azienda_id, l.id as lotto_id, l.articolo_id, l.codice, l.scadenza, m.magazzino_id, sum(m.qta) as qta,
  a.codice as articolo_codice, a.descrizione as articolo_descrizione, a.um
from public.lotti l
join public.movimenti m on m.lotto_id = l.id
join public.articoli a on a.id = l.articolo_id
group by l.azienda_id, l.id, l.articolo_id, l.codice, l.scadenza, m.magazzino_id, a.codice, a.descrizione, a.um
having sum(m.qta) <> 0;

-- Costo medio ponderato dei carichi (acquisti, resi cliente, rettifiche e inventari in più).
create function public.costo_medio(_articolo uuid) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select round(sum(m.qta * c.costo_unitario) / nullif(sum(m.qta), 0), 4)
       from public.movimenti m join public.movimenti_costi c on c.movimento_id = m.id
      where m.articolo_id = _articolo and m.qta > 0 and c.costo_unitario > 0),
    (select costo_ultimo from public.articoli_costi where articolo_id = _articolo),
    0)
$$;
revoke execute on function public.costo_medio(uuid) from public, anon, authenticated;

-- ---------- Prezzo di vendita ----------
-- Ordine: listino dedicato del cliente → listino assegnato al cliente → listino predefinito →
-- costo × ricarico (articolo, categoria, listino predefinito). Per quantità: lo scaglione più alto ≤ qta.
create function public.prezzo_vendita(_cliente uuid, _articolo uuid, _qta numeric default 1, _data date default current_date)
returns table (prezzo numeric, sconto numeric, listino_id uuid, origine text)
language plpgsql stable security definer set search_path = '' as $$
declare
  az uuid := public.azienda_corrente();
  l record;
  p record;
  ric numeric;
  sc_cliente numeric := 0;
begin
  if az is null or not exists (select 1 from public.articoli a where a.id = _articolo and a.azienda_id = az) then
    raise exception 'Articolo non valido';
  end if;
  if _cliente is not null then
    select s.sconto into sc_cliente from public.soggetti s where s.id = _cliente and s.azienda_id = az;
  end if;
  for l in
    select li.id, 'dedicato' as o, 1 as ord from public.listini li
      where li.azienda_id = az and li.soggetto_id = _cliente and _cliente is not null and li.attivo
        and (li.valido_dal is null or li.valido_dal <= _data) and (li.valido_al is null or li.valido_al >= _data)
    union all
    select li.id, 'cliente', 2 from public.listini li join public.soggetti s on s.listino_id = li.id
      where s.id = _cliente and li.attivo
        and (li.valido_dal is null or li.valido_dal <= _data) and (li.valido_al is null or li.valido_al >= _data)
    union all
    select li.id, 'predefinito', 3 from public.listini li
      where li.azienda_id = az and li.predefinito and li.attivo
    order by 3
  loop
    select lp.prezzo, lp.sconto into p from public.listini_prezzi lp
      where lp.listino_id = l.id and lp.articolo_id = _articolo and lp.qta_minima <= coalesce(_qta, 1)
      order by lp.qta_minima desc limit 1;
    if found then
      return query select p.prezzo, case when p.sconto > 0 then p.sconto else coalesce(sc_cliente, 0) end, l.id, l.o::text;
      return;
    end if;
  end loop;
  select coalesce(a.ricarico, c.ricarico, pc.ricarico, (select li.ricarico from public.listini li where li.azienda_id = az and li.predefinito))
    into ric
    from public.articoli a
    left join public.categorie c on c.id = a.categoria_id
    left join public.categorie pc on pc.id = c.parent_id
    where a.id = _articolo;
  if ric is not null then
    return query select round(public.costo_medio(_articolo) * (1 + ric / 100), 4), coalesce(sc_cliente, 0), null::uuid, 'ricarico'::text;
    return;
  end if;
  return query select 0::numeric, coalesce(sc_cliente, 0), null::uuid, 'nessuno'::text;
end $$;

-- Rettifica di magazzino (inventario, rotture, differenze).
create function public.rettifica_magazzino(_articolo uuid, _magazzino uuid, _qta numeric, _lotto text default null,
  _scadenza date default null, _nota text default null, _costo numeric default null, _inventario boolean default false)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  az uuid := public.azienda_corrente();
  art record;
  lid uuid;
  mid uuid;
begin
  if not public.ha_permesso('gestire_magazzino') then raise exception 'Permesso negato'; end if;
  select * into art from public.articoli where id = _articolo and azienda_id = az;
  if not found then raise exception 'Articolo non valido'; end if;
  if not exists (select 1 from public.magazzini where id = _magazzino and azienda_id = az) then raise exception 'Magazzino non valido'; end if;
  if coalesce(_qta, 0) = 0 then raise exception 'Quantità a zero'; end if;
  if art.gestione_lotti and nullif(btrim(_lotto), '') is null then raise exception 'Indica il lotto'; end if;
  if nullif(btrim(_lotto), '') is not null then
    insert into public.lotti (azienda_id, articolo_id, codice, scadenza) values (az, _articolo, btrim(_lotto), _scadenza)
      on conflict (articolo_id, codice) do update set scadenza = coalesce(excluded.scadenza, public.lotti.scadenza)
      returning id into lid;
  end if;
  insert into public.movimenti (azienda_id, articolo_id, magazzino_id, lotto_id, qta, causale, nota)
    values (az, _articolo, _magazzino, lid, _qta, case when _inventario then 'inventario' else 'rettifica' end, _nota)
    returning id into mid;
  insert into public.movimenti_costi (movimento_id, azienda_id, costo_unitario)
    values (mid, az, case when _qta > 0 then coalesce(_costo, public.costo_medio(_articolo)) else public.costo_medio(_articolo) end);
  return mid;
end $$;

-- Costo manuale di un articolo (finché non arriva il primo acquisto da bolla).
create function public.imposta_costo(_articolo uuid, _costo numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare az uuid := public.azienda_corrente();
begin
  if not (public.ha_permesso('vedere_costi') and public.ha_permesso('gestire_articoli')) then raise exception 'Permesso negato'; end if;
  if not exists (select 1 from public.articoli where id = _articolo and azienda_id = az) then raise exception 'Articolo non valido'; end if;
  insert into public.articoli_costi (articolo_id, azienda_id, costo_ultimo) values (_articolo, az, greatest(coalesce(_costo,0),0))
    on conflict (articolo_id) do update set costo_ultimo = excluded.costo_ultimo, aggiornato_il = now();
end $$;
