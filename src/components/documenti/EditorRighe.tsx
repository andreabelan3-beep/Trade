import type * as React from "react";
import { Trash2, ArrowDown, ArrowUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoNumero } from "@/components/comuni/Campi";
import { SceltaArticolo, type ArticoloBreve } from "@/components/comuni/Scelte";
import { formatEuro, importoRiga, totaliDocumento } from "@/lib/formato";
import { messaggioErrore } from "@/lib/formato";
import { supabase } from "@/lib/dati";

export type RigaDoc = {
  id: string;
  articolo_id: string | null;
  codice: string | null;
  descrizione: string;
  um: string;
  qta: number;
  prezzo: number;
  sconto: number;
  iva: number;
  lotto?: string | null;
  scadenza?: string | null;
  data_consegna?: string | null;
  ordine_riga_id?: string | null;
};

export const nuovaRiga = (iva = 22): RigaDoc => ({
  id: crypto.randomUUID(),
  articolo_id: null,
  codice: null,
  descrizione: "",
  um: "PZ",
  qta: 1,
  prezzo: 0,
  sconto: 0,
  iva,
});

/**
 * Prezzo proposto quando si aggiunge un articolo.
 * vendita: listino del cliente (dedicato → assegnato → predefinito → ricarico sul costo);
 * acquisto: ultimo prezzo netto del fornitore (codici_fornitore).
 */
export async function prezzoProposto(
  tipo: "vendita" | "acquisto",
  soggetto: string | null,
  articolo: string,
  qta: number,
): Promise<{ prezzo: number; sconto: number; codice?: string | null } | null> {
  if (tipo === "vendita") {
    const r = await supabase.rpc("prezzo_vendita", { _cliente: soggetto as string, _articolo: articolo, _qta: qta });
    const p = r.data?.[0];
    return p ? { prezzo: Number(p.prezzo), sconto: Number(p.sconto) } : null;
  }
  if (!soggetto) return null;
  const r = await supabase
    .from("codici_fornitore")
    .select("codice, ultimo_prezzo")
    .eq("articolo_id", articolo)
    .eq("fornitore_id", soggetto)
    .order("aggiornato_il", { ascending: false })
    .limit(1);
  const c = r.data?.[0];
  return c ? { prezzo: Number(c.ultimo_prezzo ?? 0), sconto: 0, codice: c.codice } : null;
}

export function EditorRighe({
  righe,
  onChange,
  bloccato,
  tipoPrezzo,
  soggetto,
  lotti,
  consegna,
  extra,
  ivaDefault = 22,
}: {
  righe: RigaDoc[];
  onChange: (r: RigaDoc[]) => void;
  bloccato?: boolean | undefined;
  tipoPrezzo: "vendita" | "acquisto";
  soggetto: string | null;
  lotti?: boolean | undefined;
  consegna?: boolean | undefined;
  /** Colonna aggiuntiva a destra (es. evaso/residuo negli ordini). */
  extra?: { titolo: string; cella: (r: RigaDoc) => React.ReactNode } | undefined;
  ivaDefault?: number | undefined;
}) {
  const cambia = (i: number, p: Partial<RigaDoc>) => onChange(righe.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const sposta = (i: number, d: -1 | 1) => {
    const n = [...righe];
    const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j]!, n[i]!];
    onChange(n);
  };

  async function aggiungi(a: ArticoloBreve) {
    const base: RigaDoc = { ...nuovaRiga(a.iva), articolo_id: a.id, codice: a.codice, descrizione: a.descrizione, um: a.um };
    try {
      const p = await prezzoProposto(tipoPrezzo, soggetto, a.id, 1);
      if (p) {
        base.prezzo = p.prezzo;
        base.sconto = p.sconto;
        if (tipoPrezzo === "acquisto" && p.codice) base.codice = p.codice;
      }
    } catch (e) {
      toast.error(messaggioErrore(e));
    }
    onChange([...righe, base]);
  }

  async function ricalcola(i: number, qta: number) {
    const r = righe[i]!;
    const p: Partial<RigaDoc> = { qta };
    if (r.articolo_id && tipoPrezzo === "vendita") {
      const np = await prezzoProposto("vendita", soggetto, r.articolo_id, qta).catch(() => null);
      // scaglioni: aggiorna il prezzo solo se l'utente non l'ha cambiato a mano rispetto al listino
      const vecchio = await prezzoProposto("vendita", soggetto, r.articolo_id, r.qta).catch(() => null);
      if (np && vecchio && vecchio.prezzo === r.prezzo && np.prezzo !== r.prezzo) {
        p.prezzo = np.prezzo;
        toast.info(`Prezzo a scaglione: ${formatEuro(np.prezzo)}`);
      }
    }
    cambia(i, p);
  }

  const tot = totaliDocumento(righe);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr className="[&>th]:px-2 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
              <th className="w-28">Codice</th>
              <th>Descrizione</th>
              <th className="w-16">UM</th>
              <th className="w-24 !text-right">Qtà</th>
              <th className="w-28 !text-right">Prezzo</th>
              <th className="w-20 !text-right">Sc. %</th>
              <th className="w-16 !text-right">IVA</th>
              {lotti && <th className="w-28">Lotto</th>}
              {lotti && <th className="w-36">Scadenza</th>}
              {consegna && <th className="w-36">Consegna</th>}
              <th className="w-28 !text-right">Importo</th>
              {extra && <th className="w-32">{extra.titolo}</th>}
              {!bloccato && <th className="w-24" />}
            </tr>
          </thead>
          <tbody>
            {righe.length === 0 && (
              <tr>
                <td colSpan={14} className="p-6 text-center text-muted-foreground">
                  Nessuna riga
                </td>
              </tr>
            )}
            {righe.map((r, i) => (
              <tr key={r.id} className="border-t align-top [&>td]:px-1.5 [&>td]:py-1.5">
                <td>
                  <Input value={r.codice ?? ""} disabled={bloccato} className="h-9 font-mono text-xs"
                    onChange={(e) => cambia(i, { codice: e.target.value || null })} />
                  {!r.articolo_id && r.qta > 0 && <p className="mt-0.5 px-1 text-[11px] text-amber-700">senza articolo</p>}
                </td>
                <td>
                  <Input value={r.descrizione} disabled={bloccato} className="h-9" onChange={(e) => cambia(i, { descrizione: e.target.value })} />
                </td>
                <td>
                  <Input value={r.um} disabled={bloccato} className="h-9" onChange={(e) => cambia(i, { um: e.target.value.toUpperCase() })} />
                </td>
                <td>
                  <CampoNumero valore={r.qta} disabled={bloccato} className="h-9" onChange={(n) => void ricalcola(i, n ?? 0)} />
                </td>
                <td>
                  <CampoNumero valore={r.prezzo} decimali={4} disabled={bloccato} className="h-9" onChange={(n) => cambia(i, { prezzo: n ?? 0 })} />
                </td>
                <td>
                  <CampoNumero valore={r.sconto} decimali={2} disabled={bloccato} className="h-9" onChange={(n) => cambia(i, { sconto: Math.min(100, n ?? 0) })} />
                </td>
                <td>
                  <CampoNumero valore={r.iva} decimali={2} disabled={bloccato} className="h-9" onChange={(n) => cambia(i, { iva: n ?? 0 })} />
                </td>
                {lotti && (
                  <td>
                    <Input value={r.lotto ?? ""} disabled={bloccato} className="h-9" placeholder={bloccato ? "" : "auto"}
                      onChange={(e) => cambia(i, { lotto: e.target.value || null })} />
                  </td>
                )}
                {lotti && (
                  <td>
                    <Input type="date" value={r.scadenza ?? ""} disabled={bloccato} className="h-9"
                      onChange={(e) => cambia(i, { scadenza: e.target.value || null })} />
                  </td>
                )}
                {consegna && (
                  <td>
                    <Input type="date" value={r.data_consegna ?? ""} disabled={bloccato} className="h-9"
                      onChange={(e) => cambia(i, { data_consegna: e.target.value || null })} />
                  </td>
                )}
                <td className="tabular pt-3 text-right font-medium">{formatEuro(importoRiga(r))}</td>
                {extra && <td className="pt-2.5">{extra.cella(r)}</td>}
                {!bloccato && (
                  <td className="whitespace-nowrap">
                    <Button size="icon" variant="ghost" className="h-8 w-7" onClick={() => sposta(i, -1)} aria-label="Su"><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-7" onClick={() => sposta(i, 1)} aria-label="Giù"><ArrowDown className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-7 text-destructive" aria-label="Togli"
                      onClick={() => onChange(righe.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        {!bloccato ? (
          <div className="flex flex-wrap gap-2">
            <SceltaArticolo onScelto={(a) => void aggiungi(a)} etichetta="+ Articolo" />
            <Button variant="ghost" onClick={() => onChange([...righe, nuovaRiga(ivaDefault)])}>
              <Plus className="mr-1 h-4 w-4" /> Riga libera
            </Button>
          </div>
        ) : (
          <span />
        )}
        <div className="tabular min-w-56 space-y-1 rounded-lg border bg-card p-3 text-sm">
          {tot.aliquote.map((a) => (
            <div key={a.iva} className="flex justify-between text-muted-foreground">
              <span>IVA {a.iva}% su {formatEuro(a.imponibile)}</span>
              <span>{formatEuro(a.imposta)}</span>
            </div>
          ))}
          <div className="flex justify-between"><span>Imponibile</span><span>{formatEuro(tot.imponibile)}</span></div>
          <div className="flex justify-between font-semibold"><span>Totale</span><span>{formatEuro(tot.totale)}</span></div>
        </div>
      </div>
    </div>
  );
}

/** Salva le righe di un documento: aggiorna/inserisce quelle presenti, toglie quelle eliminate. */
export async function salvaRighe(
  tabella: "ddt_righe" | "ordini_righe" | "offerte_righe",
  chiave: "ddt_id" | "ordine_id" | "offerta_id",
  docId: string,
  righe: RigaDoc[],
  idIniziali: string[],
  campiExtra: (keyof RigaDoc)[] = [],
) {
  const tolte = idIniziali.filter((id) => !righe.some((r) => r.id === id));
  if (tolte.length) {
    const d = await supabase.from(tabella).delete().in("id", tolte);
    if (d.error) throw d.error;
  }
  if (!righe.length) return;
  const rows = righe.map((r, i) => {
    const base: Record<string, unknown> = {
      id: r.id,
      [chiave]: docId,
      posizione: i + 1,
      articolo_id: r.articolo_id,
      codice: r.codice,
      descrizione: r.descrizione,
      um: r.um || "PZ",
      qta: r.qta,
      prezzo: r.prezzo,
      sconto: r.sconto,
      iva: r.iva,
    };
    for (const c of campiExtra) base[c] = r[c] ?? null;
    return base;
  });
  const u = await supabase.from(tabella).upsert(rows as never, { onConflict: "id" });
  if (u.error) throw u.error;
}
