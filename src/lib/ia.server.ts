/**
 * Lettura dei DDT con l'IA, solo lato server (la chiave non arriva mai al browser).
 * Si accende mettendo su Cloudflare (Settings → Variables and Secrets, tipo Secret) UNA di queste:
 *  - ANTHROPIC_API_KEY → Claude (preferito)
 *  - OPENAI_API_KEY    → OpenAI
 * Senza chiave la funzione risponde con un messaggio chiaro e il resto dell'app funziona.
 */

export type ErroreIA = "spenta" | "credito" | "limite" | "chiave" | "servizio";
export class IAError extends Error {
  constructor(public tipo: ErroreIA, message: string, public dettaglio?: unknown) {
    super(message);
  }
}

export type FileDoc = { mime: string; base64: string; nome: string };

const TEMPO = 180_000;

export function fornitoreIA(): "anthropic" | "openai" | null {
  if (process.env["ANTHROPIC_API_KEY"]?.trim()) return "anthropic";
  if (process.env["OPENAI_API_KEY"]?.trim()) return "openai";
  return null;
}

/** Chiede all'IA di compilare lo schema JSON leggendo i file. Restituisce l'oggetto. */
export async function estraiJson(prompt: string, files: FileDoc[], schema: Record<string, unknown>): Promise<unknown> {
  const f = fornitoreIA();
  if (!f) throw new IAError("spenta", "Nessuna chiave IA configurata");
  return f === "anthropic" ? viaAnthropic(prompt, files, schema) : viaOpenAI(prompt, files, schema);
}

async function chiama(url: string, headers: Record<string, string>, body: unknown) {
  let r: Response;
  try {
    r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TEMPO),
    });
  } catch (e) {
    throw new IAError("servizio", "Rete o tempo scaduto", e);
  }
  if (r.ok) return r.json() as Promise<Record<string, unknown>>;
  let det: unknown = null;
  try {
    det = await r.json();
  } catch {
    /* corpo non JSON */
  }
  const testo = JSON.stringify(det ?? "");
  if (r.status === 401 || r.status === 403) throw new IAError("chiave", "Chiave non valida", det);
  if (r.status === 429 && /quota|billing|credit/i.test(testo)) throw new IAError("credito", "Credito esaurito", det);
  if (r.status === 400 && /credit balance/i.test(testo)) throw new IAError("credito", "Credito esaurito", det);
  if (r.status === 429 || r.status === 529) throw new IAError("limite", "Troppe richieste", det);
  throw new IAError("servizio", "Errore del servizio", { status: r.status, det });
}

async function viaAnthropic(prompt: string, files: FileDoc[], schema: Record<string, unknown>) {
  const content: unknown[] = files.map((f) =>
    f.mime === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.base64 } }
      : { type: "image", source: { type: "base64", media_type: f.mime, data: f.base64 } },
  );
  content.push({ type: "text", text: prompt });
  const res = await chiama(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": process.env["ANTHROPIC_API_KEY"]!.trim(), "anthropic-version": "2023-06-01" },
    {
      model: process.env["ANTHROPIC_MODEL"]?.trim() || "claude-sonnet-5-5",
      max_tokens: 16000,
      tools: [{ name: "registra_ddt", description: "Registra i dati letti dal DDT", input_schema: schema }],
      tool_choice: { type: "tool", name: "registra_ddt" },
      messages: [{ role: "user", content }],
    },
  );
  const blocchi = (res["content"] as { type: string; input?: unknown }[] | undefined) ?? [];
  const uso = blocchi.find((b) => b.type === "tool_use");
  if (!uso?.input) throw new IAError("servizio", "Risposta vuota");
  return uso.input;
}

async function viaOpenAI(prompt: string, files: FileDoc[], schema: Record<string, unknown>) {
  const parts: unknown[] = files.map((f) =>
    f.mime === "application/pdf"
      ? { type: "input_file", filename: f.nome, file_data: `data:application/pdf;base64,${f.base64}` }
      : { type: "input_image", image_url: `data:${f.mime};base64,${f.base64}`, detail: "high" },
  );
  const res = await chiama(
    "https://api.openai.com/v1/responses",
    { Authorization: `Bearer ${process.env["OPENAI_API_KEY"]!.trim()}` },
    {
      model: process.env["OPENAI_MODEL"]?.trim() || "gpt-5",
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }, ...parts] }],
      text: { format: { type: "json_schema", name: "ddt", strict: true, schema } },
    },
  );
  const out = (res["output"] as { type: string; content?: { type: string; text?: string }[] }[] | undefined) ?? [];
  const txt = out
    .flatMap((o) => (o.type === "message" ? (o.content ?? []) : []))
    .map((c) => (c.type === "output_text" ? (c.text ?? "") : ""))
    .join("");
  if (!txt) throw new IAError("servizio", "Risposta vuota");
  return JSON.parse(txt);
}

export function messaggioIA(e: unknown): string {
  if (!(e instanceof IAError)) return "Lettura del DDT non riuscita: riprova.";
  switch (e.tipo) {
    case "spenta":
      return "La lettura automatica non è attiva: va inserita la chiave IA (ANTHROPIC_API_KEY o OPENAI_API_KEY) su Cloudflare.";
    case "credito":
      return "Credito del servizio IA esaurito: ricaricalo e riprova.";
    case "limite":
      return "Troppe richieste in questo momento: riprova tra qualche minuto.";
    case "chiave":
      return "Chiave del servizio IA non valida: va controllata su Cloudflare.";
    default:
      return "Il servizio di lettura non ha risposto: riprova.";
  }
}

export function inBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
