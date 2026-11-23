import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { estraiJson, inBase64, IAError, messaggioIA, type FileDoc } from "@/lib/ia.server";

/**
 * Lettura con l'IA del DDT di un fornitore (file nel bucket privato "bolle/<azienda>/<ddt>/…").
 * Riempie testata (fornitore, numero, data) e righe (codice, descrizione, qta, prezzo, sconto, lotto, scadenza)
 * di un DDT in entrata ancora in bozza, e abbina gli articoli: codice fornitore → codice articolo → EAN.
 * Tutto con il client dell'utente (RLS): chi non può gestire il DDT non lo legge.
 */

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fornitore_nome", "fornitore_partita_iva", "numero", "data", "righe"],
  properties: {
    fornitore_nome: { type: ["string", "null"] },
    fornitore_partita_iva: { type: ["string", "null"] },
    numero: { type: ["string", "null"] },
    data: { type: ["string", "null"], description: "AAAA-MM-GG" },
    righe: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["codice", "ean", "descrizione", "um", "quantita", "prezzo", "sconto_perc", "lotto", "scadenza"],
        properties: {
          codice: { type: ["string", "null"] },
          ean: { type: ["string", "null"] },
          descrizione: { type: ["string", "null"] },
          um: { type: ["string", "null"] },
          quantita: { type: ["number", "null"] },
          prezzo: { type: ["number", "null"] },
          sconto_perc: { type: ["number", "null"] },
          lotto: { type: ["string", "null"] },
          scadenza: { type: ["string", "null"], description: "AAAA-MM-GG" },
        },
      },
    },
  },
} as const;

type Letta = {
  fornitore_nome: string | null;
  fornitore_partita_iva: string | null;
  numero: string | null;
  data: string | null;
  righe: {
    codice: string | null;
    ean: string | null;
    descrizione: string | null;
    um: string | null;
    quantita: number | null;
    prezzo: number | null;
    sconto_perc: number | null;
    lotto: string | null;
    scadenza: string | null;
  }[];
};

const PROMPT = `Leggi questo documento di trasporto (DDT) di un fornitore italiano, anche su più pagine, ed estrai:
- fornitore (chi EMETTE il DDT, non il destinatario) e la sua partita IVA;
- numero e data del DDT (data AAAA-MM-GG);
- tutte le righe merce: codice articolo del fornitore, codice EAN se presente, descrizione, unità di misura, quantità,
  prezzo unitario prima dello sconto, sconto in percentuale (se "30+10" calcola lo sconto equivalente: 37), lotto e data di
  scadenza del lotto (AAAA-MM-GG; se c'è solo mese/anno usa l'ultimo giorno del mese).
Se una riga ha più lotti, fai una riga per lotto con la sua quantità.
Ignora righe di soli totali, note, riferimenti d'ordine, spese di trasporto.
Numeri con il punto decimale. Dato mancante o illeggibile: null. Non inventare.`;

const dataOk = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

export const leggiDdt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const d = await sb.from("ddt").select("id, direzione, stato, file_path, soggetto_id").eq("id", data.id).maybeSingle();
    if (d.error || !d.data) throw new Error("DDT non trovato");
    if (d.data.direzione !== "entrata" || d.data.stato !== "bozza") throw new Error("Si leggono solo DDT in entrata in bozza");
    if (!d.data.file_path) throw new Error("Carica prima il file del DDT");

    const f = await sb.storage.from("bolle").download(d.data.file_path);
    if (f.error || !f.data) throw new Error("File del DDT non leggibile");
    const nome = d.data.file_path.split("/").pop() ?? "ddt";
    const mime = /\.pdf$/i.test(nome) ? "application/pdf" : f.data.type || "image/jpeg";
    const files: FileDoc[] = [{ mime, nome, base64: inBase64(await f.data.arrayBuffer()) }];

    let letta: Letta;
    try {
      letta = (await estraiJson(PROMPT, files, SCHEMA as unknown as Record<string, unknown>)) as Letta;
    } catch (e) {
      console.error("leggiDdt", e instanceof IAError ? { tipo: e.tipo, det: e.dettaglio } : e);
      throw new Error(messaggioIA(e));
    }

    // Fornitore: partita IVA, poi prima parola del nome.
    let fornitore = d.data.soggetto_id;
    if (!fornitore) {
      const piva = (letta.fornitore_partita_iva ?? "").replace(/\D/g, "").slice(-11);
      if (piva.length === 11) {
        const s = await sb.from("soggetti").select("id").eq("fornitore", true).ilike("partita_iva", `%${piva}%`).limit(2);
        if (s.data?.length === 1) fornitore = s.data[0]!.id;
      }
      const primo = (letta.fornitore_nome ?? "").replace(/s\.?\s?(r\.?l|p\.?a|n\.?c|a\.?s)\.?/gi, "").trim().split(/\s+/)[0] ?? "";
      if (!fornitore && primo.length >= 3) {
        const s = await sb.from("soggetti").select("id").eq("fornitore", true).ilike("ragione_sociale", `%${primo}%`).limit(2);
        if (s.data?.length === 1) fornitore = s.data[0]!.id;
      }
    }

    // Abbinamento articoli
    const codici = letta.righe.map((r) => r.codice?.trim()).filter((c): c is string => !!c);
    const eans = letta.righe.map((r) => r.ean?.trim()).filter((c): c is string => !!c);
    const [cf, art, artEan] = await Promise.all([
      fornitore && codici.length
        ? sb.from("codici_fornitore").select("codice, articolo_id").eq("fornitore_id", fornitore).in("codice", codici)
        : Promise.resolve({ data: [] as { codice: string; articolo_id: string }[] }),
      codici.length ? sb.from("articoli").select("id, codice, um, iva").in("codice", codici) : Promise.resolve({ data: [] as { id: string; codice: string; um: string; iva: number }[] }),
      eans.length ? sb.from("articoli").select("id, ean, um, iva").in("ean", eans) : Promise.resolve({ data: [] as { id: string; ean: string | null; um: string; iva: number }[] }),
    ]);
    const ivaDi = new Map<string, number>();
    for (const a of [...(art.data ?? []), ...(artEan.data ?? [])]) ivaDi.set(a.id, a.iva);

    const righe = letta.righe.map((r, i) => {
      const c = r.codice?.trim() ?? "";
      const id =
        cf.data?.find((x) => x.codice === c)?.articolo_id ??
        art.data?.find((x) => x.codice === c)?.id ??
        artEan.data?.find((x) => x.ean && x.ean === r.ean?.trim())?.id ??
        null;
      return {
        ddt_id: data.id,
        posizione: i + 1,
        articolo_id: id,
        codice: c || null,
        descrizione: r.descrizione ?? "",
        um: (r.um ?? "PZ").toUpperCase().slice(0, 10),
        qta: Math.max(0, r.quantita ?? 0),
        prezzo: Math.max(0, r.prezzo ?? 0),
        sconto: Math.min(100, Math.max(0, r.sconto_perc ?? 0)),
        iva: id ? (ivaDi.get(id) ?? 22) : 22,
        lotto: r.lotto?.trim() || null,
        scadenza: dataOk(r.scadenza),
      };
    });

    const up = await sb
      .from("ddt")
      .update({
        soggetto_id: fornitore,
        numero: letta.numero,
        ...(dataOk(letta.data) ? { data: dataOk(letta.data)! } : {}),
        lettura_ia: letta as unknown as never,
      })
      .eq("id", data.id);
    if (up.error) throw new Error(up.error.message);
    await sb.from("ddt_righe").delete().eq("ddt_id", data.id);
    if (righe.length) {
      const ins = await sb.from("ddt_righe").insert(righe);
      if (ins.error) throw new Error(ins.error.message);
    }
    return {
      righe: righe.length,
      abbinate: righe.filter((r) => r.articolo_id).length,
      fornitoreTrovato: !!fornitore,
      fornitoreLetto: letta.fornitore_nome,
      partitaIva: letta.fornitore_partita_iva,
    };
  });
