# Trade — regole di lavoro

Gestionale commerciale (prodotti): DDT in entrata/uscita con lettura IA, magazzino con lotti e scadenze (FEFO),
listini (anche dedicati al singolo cliente, con scaglioni), offerte → ordini → DDT con evasione parziale (stralci),
scadenzario e previsionale, analisi vendite/margini/magazzino, export DDT verso Danea Easyfatt (Easyfatt-Xml).

Nata il 23/11/2026 dalla base tecnica di Arti-Gest (stesso stack), ma con database, utenti e dati separati.

## Stack
- TanStack Start + React + Tailwind/shadcn, pubblicata su Cloudflare Workers (`wrangler.jsonc`, nome `trade`).
- Supabase progetto `zakosqwxfjhnsrcywcjr` (piano gratuito, eu-central-1). Il browser parla direttamente con
  Supabase (RLS); il server (Worker) serve solo per inviti utenti e lettura IA dei DDT.
- Segreti solo su Cloudflare (Settings → Variables and Secrets, tipo Secret): `SUPABASE_SERVICE_ROLE_KEY` (inviti),
  `ANTHROPIC_API_KEY` oppure `OPENAI_API_KEY` (lettura DDT). Mai nel repository.

## Database (`database/`)
- `0001`…`0005`: script applicati in ordine sul progetto vero (registro: `supabase_migrations`).
  Nuove modifiche = nuovo script numerato, applicato con il connettore Supabase, poi `get_advisors`.
- `database/test/prova_completa.sql`: prova dell'intero flusso come utente collegato; finisce sempre con
  un'eccezione "ESITO: …" così non lascia dati.
- Regole chiave:
  - ogni tabella ha `azienda_id`, impostato dal trigger `imposta_azienda()` e controllato dalla RLS
    (`azienda_corrente()`, `ha_permesso()`; il titolare ha tutti i permessi);
  - i costi stanno solo in `articoli_costi` e `movimenti_costi` (permesso `vedere_costi`);
  - il magazzino si muove SOLO con le funzioni: `conferma_ddt` (carico/scarico, FEFO se il lotto è vuoto,
    costo medio ponderato, codici fornitore, scadenze), `riapri_ddt`, `annulla_ddt`, `rettifica_magazzino`;
  - DDT in uscita numerati alla conferma (`N/AAAA`, senza buchi: le bozze numerate non si cancellano);
  - stralcio = `ordini_righe.chiusa` (`chiudi_residuo`); evaso/residuo calcolati in `ordini_righe_evasione`;
  - scadenze dei DDT: fattura differita a fine mese + rate del pagamento (`genera_scadenze_ddt`);
  - prezzo di vendita: `prezzo_vendita()` = listino dedicato → listino del cliente → predefinito → costo × ricarico.
- Dopo una modifica allo schema rigenerare `src/integrations/supabase/types.ts` (azienda_id facoltativo negli Insert).

## App
- Pagine in `src/routes/_authenticated/`; righe documento condivise in `src/components/documenti/EditorRighe.tsx`.
- PDF (DDT, ordini, offerte) nel browser: `src/lib/documento-pdf.ts`. Export Danea: `src/lib/danea.ts`.
- Controllo prima di inviare: `bunx tsc --noEmit -p .` e `bun run build`.
