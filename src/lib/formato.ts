// Formati e piccole regole condivise (numeri, date, importi, messaggi d'errore).

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const euro4 = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 4 });
const num = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 3 });

export const formatEuro = (n: number | null | undefined) => (n === null || n === undefined ? "—" : euro.format(Number(n)));
export const formatPrezzo = (n: number | null | undefined) => (n === null || n === undefined ? "—" : euro4.format(Number(n)));
export const formatNum = (n: number | null | undefined) => (n === null || n === undefined ? "—" : num.format(Number(n)));
export const formatPerc = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${num.format(Number(n))}%`;

/** "2026-11-23" → "23/11/2026" (senza fuso orario). */
export const formatData = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

/** Oggi in Italia come "YYYY-MM-DD". */
export const oggi = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
export const traGiorni = (n: number, da = oggi()) => {
  const d = new Date(`${da}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const tondo = (n: number, dec = 2) => {
  const f = 10 ** dec;
  return Math.round((n + Number.EPSILON) * f) / f;
};

/** Legge "1.250,50", "1250.50", "1250,5". Stringa vuota → null. */
export function leggiNumero(s: string): number | null {
  const t = s.trim().replace(/\s/g, "");
  if (!t) return null;
  const norm = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

export type Riga = { qta: number; prezzo: number; sconto: number; iva: number };

export const importoRiga = (r: Riga) => tondo(r.qta * r.prezzo * (1 - r.sconto / 100));

/** Totali come nel database: imponibile per aliquota, IVA arrotondata per aliquota. */
export function totaliDocumento(righe: Riga[]) {
  const perIva = new Map<number, number>();
  for (const r of righe) perIva.set(r.iva, tondo((perIva.get(r.iva) ?? 0) + importoRiga(r)));
  let imponibile = 0;
  let iva = 0;
  const aliquote: { iva: number; imponibile: number; imposta: number }[] = [];
  for (const [aliq, imp] of [...perIva.entries()].sort((a, b) => a[0] - b[0])) {
    const imposta = tondo((imp * aliq) / 100);
    aliquote.push({ iva: aliq, imponibile: imp, imposta });
    imponibile = tondo(imponibile + imp);
    iva = tondo(iva + imposta);
  }
  return { imponibile, iva, totale: tondo(imponibile + iva), aliquote };
}

/** Messaggio leggibile da un errore di Supabase (le funzioni del database scrivono già in italiano). */
export function messaggioErrore(e: unknown): string {
  const m =
    typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e ?? "");
  if (/duplicate key.*ddt_numero_entrata/i.test(m)) return "Questo DDT del fornitore è già stato registrato.";
  if (/duplicate key.*articoli_azienda_id_codice/i.test(m)) return "Esiste già un articolo con questo codice.";
  if (/duplicate key.*soggetti_codice/i.test(m)) return "Esiste già un cliente/fornitore con questo codice.";
  if (/duplicate key.*listini_prezzi/i.test(m)) return "Questo articolo è già nel listino con la stessa quantità minima.";
  if (/row-level security|permission denied|Permesso negato/i.test(m)) return "Non hai il permesso per questa operazione.";
  if (/failed to fetch|network/i.test(m)) return "Rete assente: riprova.";
  if (/violates foreign key/i.test(m)) return "È collegato ad altri documenti: non si può togliere.";
  return m || "Operazione non riuscita.";
}
