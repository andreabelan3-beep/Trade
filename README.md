# Trade

Gestionale commerciale. Vedi `AGENTS.md` per le regole tecniche.

## Messa in linea (una volta)
1. GitHub: crea un repository privato vuoto `trade` e caricaci questo codice.
2. Cloudflare → Workers & Pages → Create → Import a repository → `trade`.
   Build command `bun run build`, deploy command `npx wrangler deploy`. Il nome del Worker deve essere `trade`.
3. Cloudflare → trade → Settings → Variables and Secrets, tipo **Secret**:
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API keys → service_role/secret) per invitare i colleghi;
   - `ANTHROPIC_API_KEY` (oppure `OPENAI_API_KEY`) per la lettura dei DDT con l'IA.
4. Supabase → Authentication → URL Configuration: Site URL = indirizzo del Worker
   (es. `https://trade.<account>.workers.dev`); Redirect URLs: lo stesso indirizzo seguito da `/**`.
5. Apri l'app, "Nuova azienda? Registrati", conferma l'email e crea l'azienda: sei il titolare.
