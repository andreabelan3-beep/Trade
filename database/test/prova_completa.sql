-- Prova completa del flusso Trade come utente collegato. Finisce sempre con un'eccezione
-- "ESITO: ..." così la transazione si annulla e nel database non resta niente.
do $$
declare
  uid uuid := gen_random_uuid();
  az uuid;
  cli uuid; forn uuid; art_l uuid; art_s uuid; pag uuid; lis uuid;
  d_in uuid; d_out uuid; d_ord uuid; ord uuid; riga_ord uuid; off uuid; ord2 uuid;
  num text; g numeric; p record; n int; esito text := '';
begin
  insert into auth.users (id, email) values (uid, 'prova-trade@example.com');
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  az := public.crea_azienda('Prova Srl', '01234567890', 'Mario', 'Rossi');
  select id into pag from public.pagamenti where nome like 'RiBa%';
  insert into public.soggetti (ragione_sociale, cliente, pagamento_id) values ('Cliente Uno', true, pag) returning id into cli;
  insert into public.soggetti (ragione_sociale, cliente, fornitore) values ('Fornitore Uno', false, true) returning id into forn;
  insert into public.articoli (codice, descrizione, gestione_lotti, gestione_scadenze) values ('MOZZ', 'Mozzarella 125g', true, true) returning id into art_l;
  insert into public.articoli (codice, descrizione) values ('SAC', 'Sacchetto') returning id into art_s;

  -- Listino dedicato al cliente
  insert into public.listini (nome, soggetto_id) values ('Cliente Uno', cli) returning id into lis;
  insert into public.listini_prezzi (listino_id, articolo_id, prezzo) values (lis, art_l, 1.10);
  insert into public.listini_prezzi (listino_id, articolo_id, prezzo, qta_minima) values (lis, art_l, 0.95, 100);
  select * into p from public.prezzo_vendita(cli, art_l, 10);
  if p.prezzo <> 1.10 or p.origine <> 'dedicato' then raise exception 'prezzo 10 pz: %', row_to_json(p); end if;
  select * into p from public.prezzo_vendita(cli, art_l, 150);
  if p.prezzo <> 0.95 then raise exception 'scaglione 150: %', p.prezzo; end if;
  esito := esito || 'listini ok; ';

  -- DDT in entrata con due lotti
  insert into public.ddt (direzione, causale, soggetto_id, numero) values ('entrata', 'acquisto', forn, 'F-77') returning id into d_in;
  insert into public.ddt_righe (ddt_id, posizione, articolo_id, codice, descrizione, qta, prezzo, lotto, scadenza)
    values (d_in, 1, art_l, 'F-MOZ', 'Mozzarella', 50, 0.60, 'L1', current_date + 5),
           (d_in, 2, art_l, 'F-MOZ', 'Mozzarella', 50, 0.70, 'L2', current_date + 20),
           (d_in, 3, art_s, 'F-SAC', 'Sacchetto', 1000, 0.02, null, null);
  perform public.conferma_ddt(d_in);
  select sum(qta) into g from public.movimenti where articolo_id = art_l;
  if g <> 100 then raise exception 'carico: %', g; end if;
  if (select count(*) from public.codici_fornitore) <> 2 then raise exception 'codici fornitore'; end if;
  esito := esito || 'carico ok (costo medio ' || (select round(sum(m.qta*c.costo_unitario)/sum(m.qta),4) from public.movimenti m join public.movimenti_costi c on c.movimento_id=m.id where m.articolo_id=art_l) || '); ';

  -- Ordine cliente 80 pz, evasione parziale 60 (FEFO: 50 da L1 + 10 da L2)
  insert into public.ordini (tipo, soggetto_id, data_consegna) values ('cliente', cli, current_date + 3) returning id into ord;
  insert into public.ordini_righe (ordine_id, posizione, articolo_id, codice, descrizione, qta, prezzo)
    values (ord, 1, art_l, 'MOZZ', 'Mozzarella 125g', 80, 1.10) returning id into riga_ord;
  d_out := public.ddt_da_ordine(ord, jsonb_build_array(jsonb_build_object('riga_id', riga_ord, 'qta', 60)));
  num := public.conferma_ddt(d_out);
  if (select string_agg(lotto || ':' || qta, ',' order by lotto) from public.ddt_righe_lotti where ddt_riga_id in (select id from public.ddt_righe where ddt_id = d_out)) <> 'L1:50.000,L2:10.000' then
    raise exception 'FEFO: %', (select string_agg(lotto || ':' || qta, ',') from public.ddt_righe_lotti where ddt_riga_id in (select id from public.ddt_righe where ddt_id = d_out));
  end if;
  if (select evasione from public.ordini_elenco where id = ord) <> 'parziale' then raise exception 'stato ordine'; end if;
  if (select residuo from public.ordini_righe_evasione where id = riga_ord) <> 20 then raise exception 'residuo'; end if;
  esito := esito || 'DDT ' || num || ' FEFO ok, residuo 20; ';

  -- Scadenze RiBa 30/60: due rate
  select count(*) into n from public.scadenze where ddt_id = d_out;
  if n <> 2 then raise exception 'scadenze: %', n; end if;
  esito := esito || 'scadenze ' || (select string_agg(to_char(data,'DD/MM') || '=' || importo, ' ' order by data) from public.scadenze where ddt_id = d_out) || '; ';

  -- Stralcio del residuo
  perform public.chiudi_residuo(riga_ord);
  if (select evasione from public.ordini_elenco where id = ord) <> 'evaso' then raise exception 'stralcio'; end if;
  esito := esito || 'stralcio ok; ';

  -- Giacenza insufficiente bloccata
  begin
    insert into public.ddt (direzione, causale, soggetto_id) values ('uscita', 'vendita', cli) returning id into d_ord;
    insert into public.ddt_righe (ddt_id, articolo_id, descrizione, qta, prezzo) values (d_ord, art_l, 'x', 500, 1);
    perform public.conferma_ddt(d_ord);
    raise exception 'doveva bloccare';
  exception when others then
    if sqlerrm = 'doveva bloccare' then raise; end if;
    esito := esito || 'blocco giacenza ok (' || sqlerrm || '); ';
  end;

  -- Riapertura del carico bloccata (lotto L1 già venduto)
  begin
    perform public.riapri_ddt(d_in);
    raise exception 'doveva bloccare riapertura';
  exception when others then
    if sqlerrm = 'doveva bloccare riapertura' then raise; end if;
    esito := esito || 'blocco riapertura ok; ';
  end;

  -- Offerta → ordine
  insert into public.offerte (soggetto_id) values (cli) returning id into off;
  insert into public.offerte_righe (offerta_id, articolo_id, descrizione, qta, prezzo) values (off, art_s, 'Sacchetto', 200, 0.05);
  ord2 := public.accetta_offerta(off);
  if (select count(*) from public.ordini_righe where ordine_id = ord2) <> 1 then raise exception 'offerta→ordine'; end if;
  esito := esito || 'offerta→ordine ok; ';

  -- Previsionale, analisi, cruscotto, export Danea
  esito := esito || 'previsionale ' || (select count(*) from public.previsionale(current_date - 30, current_date + 120)) || ' righe; ';
  esito := esito || 'analisi ' || (select string_agg(etichetta || ' ricavo ' || ricavo || ' margine ' || margine || ' (' || perc_margine || '%)', ' | ') from public.analisi_vendite(current_date - 30, current_date, 'mese')) || '; ';
  esito := esito || 'cruscotto ' || public.cruscotto()::text || '; ';
  if public.segna_ddt_esportati(array[d_out]) <> 1 then raise exception 'danea'; end if;
  esito := esito || 'danea ok';

  raise exception 'ESITO: %', esito;
end $$;
