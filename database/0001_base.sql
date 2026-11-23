-- Trade 0001 — base: aziende, utenti, permessi, numerazione, anagrafiche, pagamenti.
-- Ogni tabella ha azienda_id, impostata dal database (trigger) e controllata dalla RLS.

create extension if not exists pg_trgm with schema extensions;

create type public.ruolo as enum ('titolare', 'ufficio', 'magazzino', 'agente');

create table public.aziende (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (btrim(nome) <> ''),
  partita_iva text,
  codice_fiscale text,
  indirizzo text,
  cap text,
  comune text,
  provincia text,
  telefono text,
  email text,
  pec text,
  iva_predefinita numeric(5,2) not null default 22,
  -- false = non si scarica più di quanto c'è in magazzino
  giacenza_negativa boolean not null default false,
  giorni_avviso_scadenze int not null default 30 check (giorni_avviso_scadenze between 0 and 3650),
  note_ddt text,
  creata_il timestamptz not null default now()
);

create table public.profili (
  id uuid primary key references auth.users on delete cascade,
  azienda_id uuid not null references public.aziende,
  nome text not null default '',
  cognome text not null default '',
  email text,
  ruolo public.ruolo not null default 'ufficio',
  attivo boolean not null default true,
  creato_il timestamptz not null default now()
);
create index on public.profili (azienda_id);

-- Elenco chiuso dei permessi: il titolare li ha tutti, gli altri ruoli secondo questa tabella.
create table public.permessi_ruolo (
  azienda_id uuid not null references public.aziende on delete cascade,
  ruolo public.ruolo not null,
  permesso text not null check (permesso in (
    'vedere_costi', 'gestire_anagrafiche', 'gestire_articoli', 'gestire_listini',
    'gestire_acquisti', 'gestire_vendite', 'gestire_magazzino', 'vedere_scadenzario',
    'vedere_analisi', 'gestire_utenti', 'gestire_impostazioni')),
  primary key (azienda_id, ruolo, permesso)
);

create function public.azienda_corrente() returns uuid
language sql stable security definer set search_path = '' as $$
  select azienda_id from public.profili where id = auth.uid() and attivo
$$;

create function public.ha_permesso(_p text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profili p
    where p.id = auth.uid() and p.attivo
      and (p.ruolo = 'titolare' or exists (
        select 1 from public.permessi_ruolo r
        where r.azienda_id = p.azienda_id and r.ruolo = p.ruolo and r.permesso = _p))
  )
$$;

-- Imposta sempre l'azienda di chi scrive (non si può scrivere nell'azienda di altri).
create function public.imposta_azienda() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.azienda_id := public.azienda_corrente();
    if new.azienda_id is null then
      raise exception 'Utente senza azienda attiva';
    end if;
  end if;
  return new;
end $$;

create function public.tocca_aggiornato() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.aggiornato_il := now();
  return new;
end $$;

-- ---------- Numerazione documenti ----------
create table public.contatori (
  azienda_id uuid not null references public.aziende on delete cascade,
  tipo text not null,
  anno int not null,
  ultimo int not null default 0,
  primary key (azienda_id, tipo, anno)
);

create function public.prossimo_numero(_azienda uuid, _tipo text, _anno int) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into public.contatori (azienda_id, tipo, anno, ultimo) values (_azienda, _tipo, _anno, 1)
  on conflict (azienda_id, tipo, anno) do update set ultimo = public.contatori.ultimo + 1
  returning ultimo into n;
  return n;
end $$;

-- ---------- Pagamenti (per lo scadenzario) ----------
-- rate: [{"giorni":30,"perc":50},{"giorni":60,"perc":50}]; fine_mese = scadenza a fine mese.
create table public.pagamenti (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  nome text not null check (btrim(nome) <> ''),
  rate jsonb not null default '[{"giorni":0,"perc":100}]',
  fine_mese boolean not null default false,
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  check (jsonb_typeof(rate) = 'array' and jsonb_array_length(rate) between 1 and 12)
);
create index on public.pagamenti (azienda_id);

-- ---------- Anagrafiche ----------
create table public.soggetti (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  codice text,
  ragione_sociale text not null check (btrim(ragione_sociale) <> ''),
  cliente boolean not null default true,
  fornitore boolean not null default false,
  partita_iva text,
  codice_fiscale text,
  indirizzo text,
  cap text,
  comune text,
  provincia text,
  nazione text not null default 'IT',
  telefono text,
  email text,
  pec text,
  codice_sdi text,
  pagamento_id uuid references public.pagamenti,
  listino_id uuid, -- FK aggiunta in 0002
  sconto numeric(5,2) not null default 0 check (sconto between 0 and 100),
  fido numeric(14,2),
  agente_id uuid references public.profili,
  note text,
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  check (cliente or fornitore)
);
create index on public.soggetti (azienda_id);
create unique index soggetti_codice on public.soggetti (azienda_id, codice) where codice is not null;
create index soggetti_nome_trgm on public.soggetti using gin (ragione_sociale extensions.gin_trgm_ops);

create table public.destinazioni (
  id uuid primary key default gen_random_uuid(),
  azienda_id uuid not null references public.aziende,
  soggetto_id uuid not null references public.soggetti on delete cascade,
  nome text not null,
  indirizzo text,
  cap text,
  comune text,
  provincia text,
  predefinita boolean not null default false
);
create index on public.destinazioni (soggetto_id);

create trigger soggetti_azienda before insert on public.soggetti for each row execute function public.imposta_azienda();
create trigger soggetti_agg before update on public.soggetti for each row execute function public.tocca_aggiornato();
create trigger destinazioni_azienda before insert on public.destinazioni for each row execute function public.imposta_azienda();
create trigger pagamenti_azienda before insert on public.pagamenti for each row execute function public.imposta_azienda();

-- La destinazione appartiene a un soggetto della stessa azienda.
create function public.controlla_destinazione() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.soggetti s where s.id = new.soggetto_id and s.azienda_id = new.azienda_id) then
    raise exception 'Soggetto non valido';
  end if;
  return new;
end $$;
create trigger destinazioni_controllo before insert or update on public.destinazioni
  for each row execute function public.controlla_destinazione();

-- ---------- RLS ----------
alter table public.aziende enable row level security;
alter table public.profili enable row level security;
alter table public.permessi_ruolo enable row level security;
alter table public.contatori enable row level security;
alter table public.pagamenti enable row level security;
alter table public.soggetti enable row level security;
alter table public.destinazioni enable row level security;

create policy aziende_leggi on public.aziende for select to authenticated using (id = public.azienda_corrente());
create policy aziende_scrivi on public.aziende for update to authenticated
  using (id = public.azienda_corrente() and public.ha_permesso('gestire_impostazioni'))
  with check (id = public.azienda_corrente());

create policy profili_leggi on public.profili for select to authenticated
  using (id = auth.uid() or azienda_id = public.azienda_corrente());
create policy profili_scrivi on public.profili for update to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_utenti'))
  with check (azienda_id = public.azienda_corrente());

create policy permessi_leggi on public.permessi_ruolo for select to authenticated using (azienda_id = public.azienda_corrente());
create policy permessi_aggiungi on public.permessi_ruolo for insert to authenticated
  with check (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_utenti') and ruolo <> 'titolare');
create policy permessi_togli on public.permessi_ruolo for delete to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_utenti'));

create policy pagamenti_leggi on public.pagamenti for select to authenticated using (azienda_id = public.azienda_corrente());
create policy pagamenti_scrivi on public.pagamenti for all to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_impostazioni'))
  with check (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_impostazioni'));

create policy soggetti_leggi on public.soggetti for select to authenticated using (azienda_id = public.azienda_corrente());
create policy soggetti_nuovo on public.soggetti for insert to authenticated
  with check (azienda_id = public.azienda_corrente() and (public.ha_permesso('gestire_anagrafiche') or public.ha_permesso('gestire_vendite')));
create policy soggetti_modifica on public.soggetti for update to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_anagrafiche'))
  with check (azienda_id = public.azienda_corrente());

create policy destinazioni_leggi on public.destinazioni for select to authenticated using (azienda_id = public.azienda_corrente());
create policy destinazioni_scrivi on public.destinazioni for all to authenticated
  using (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_anagrafiche'))
  with check (azienda_id = public.azienda_corrente() and public.ha_permesso('gestire_anagrafiche'));

-- Le anagrafiche non si cancellano (storico documenti): si disattivano.
revoke delete on public.soggetti from authenticated;
revoke all on public.contatori from anon, authenticated;
revoke insert, delete on public.aziende, public.profili from authenticated;
revoke execute on function public.prossimo_numero(uuid, text, int) from public, anon, authenticated;
