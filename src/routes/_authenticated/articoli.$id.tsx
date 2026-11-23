import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pagina } from "@/components/app/AppShell";
import { Percorso } from "@/components/app/Percorso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Campo, CampoNumero } from "@/components/comuni/Campi";
import { SceltaSoggetto } from "@/components/comuni/Scelte";
import { Stato } from "@/components/comuni/Stato";
import { ok, supabase } from "@/lib/dati";
import { formatData, formatEuro, formatNum, formatPrezzo, messaggioErrore, oggi } from "@/lib/formato";
import type { Database } from "@/integrations/supabase/types";

type Articolo = Database["public"]["Tables"]["articoli"]["Row"];

export const Route = createFileRoute("/_authenticated/articoli/$id")({
  head: () => ({ meta: [{ title: "Articolo — Trade" }] }),
  component: SchedaArticolo,
});

const CAUSALI: Record<string, string> = {
  acquisto: "Acquisto", vendita: "Vendita", reso_cliente: "Reso cliente", reso_fornitore: "Reso fornitore",
  conto_visione: "Conto visione", omaggio: "Omaggio", rettifica: "Rettifica", inventario: "Inventario",
};

function SchedaArticolo() {
  const { id } = Route.useParams();
  const { perms } = Route.useRouteContext();
  const qc = useQueryClient();
  const art = useQuery({ queryKey: ["articoli", id], queryFn: async () => ok(await supabase.from("articoli").select("*").eq("id", id).single()) });
  const categorie = useQuery({ queryKey: ["categorie"], queryFn: async () => ok(await supabase.from("categorie").select("id, nome, parent_id").order("nome")) });
  const costo = useQuery({
    queryKey: ["articoli", id, "costo"],
    enabled: perms.vedere_costi,
    queryFn: async () => ok(await supabase.from("articoli_costi").select("costo_ultimo, aggiornato_il").eq("articolo_id", id).maybeSingle()),
  });
  const prezzi = useQuery({
    queryKey: ["listini_prezzi", "articolo", id],
    queryFn: async () => ok(await supabase.from("listini_prezzi").select("id, prezzo, sconto, qta_minima, listini(id, nome, predefinito, soggetti!listini_soggetto_id_fkey(ragione_sociale))").eq("articolo_id", id)),
  });
  const lotti = useQuery({
    queryKey: ["magazzino", "lotti", id],
    queryFn: async () => ok(await supabase.from("lotti_giacenza").select("*").eq("articolo_id", id).order("scadenza", { nullsFirst: false })),
  });
  const totale = useQuery({
    queryKey: ["magazzino", "giacenza", id],
    queryFn: async () => ok(await supabase.from("giacenze").select("qta, lotto_id, magazzino_id").eq("articolo_id", id)),
  });
  const movimenti = useQuery({
    queryKey: ["magazzino", "movimenti", id],
    queryFn: async () =>
      ok(await supabase.from("movimenti").select("id, data, qta, causale, nota, lotti(codice), ddt_righe(ddt(id, numero, direzione, soggetti(ragione_sociale)))")
        .eq("articolo_id", id).order("data", { ascending: false }).order("creato_il", { ascending: false }).limit(50)),
  });
  const codici = useQuery({
    queryKey: ["codici_fornitore", id],
    enabled: perms.vedere_costi || perms.gestire_acquisti,
    queryFn: async () => ok(await supabase.from("codici_fornitore").select("id, codice, ultimo_prezzo, aggiornato_il, soggetti(ragione_sociale)").eq("articolo_id", id)),
  });

  const [a, setA] = useState<Articolo | null>(null);
  const [nuovoCosto, setNuovoCosto] = useState<number | null>(null);
  useEffect(() => { if (art.data) setA(art.data); }, [art.data]);
  useEffect(() => { setNuovoCosto(costo.data ? Number(costo.data.costo_ultimo) : null); }, [costo.data]);

  const salva = useMutation({
    mutationFn: async () => {
      if (!a) return;
      const { id: _i, azienda_id: _a, creato_il: _c, aggiornato_il: _u, ...dati } = a;
      ok(await supabase.from("articoli").update(dati).eq("id", id));
      if (perms.vedere_costi && nuovoCosto !== null && nuovoCosto !== Number(costo.data?.costo_ultimo ?? -1)) {
        ok(await supabase.rpc("imposta_costo", { _articolo: id, _costo: nuovoCosto }));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["articoli"] });
      toast.success("Articolo salvato");
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });

  if (!a) return <Pagina titolo="Articolo">Caricamento…</Pagina>;
  const dis = !perms.gestire_articoli;
  const set = <K extends keyof Articolo>(k: K, v: Articolo[K]) => setA({ ...a, [k]: v });
  const qtaTot = (totale.data ?? []).reduce((s, g) => s + Number(g.qta), 0);
  const senzaLotto = (totale.data ?? []).filter((g) => !g.lotto_id).reduce((s, g) => s + Number(g.qta), 0);

  return (
    <Pagina titolo={a.descrizione}
      percorso={<Percorso><Link to="/articoli">Articoli</Link><span>{a.codice}</span></Percorso>}
      azioni={perms.gestire_articoli && <Button onClick={() => salva.mutate()} disabled={salva.isPending}>Salva</Button>}>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 rounded-lg border bg-card p-4 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-4">
            <Campo label="Codice"><Input value={a.codice} disabled={dis} onChange={(e) => set("codice", e.target.value)} /></Campo>
            <Campo label="Descrizione" className="sm:col-span-3"><Input value={a.descrizione} disabled={dis} onChange={(e) => set("descrizione", e.target.value)} /></Campo>
            <Campo label="UM"><Input value={a.um} disabled={dis} onChange={(e) => set("um", e.target.value.toUpperCase())} /></Campo>
            <Campo label="IVA %"><CampoNumero valore={a.iva} decimali={2} disabled={dis} onChange={(n) => set("iva", n ?? 22)} /></Campo>
            <Campo label="EAN"><Input value={a.ean ?? ""} disabled={dis} onChange={(e) => set("ean", e.target.value || null)} /></Campo>
            <Campo label="Marca"><Input value={a.marca ?? ""} disabled={dis} onChange={(e) => set("marca", e.target.value || null)} /></Campo>
            <Campo label="Categoria" className="sm:col-span-2">
              <Select value={a.categoria_id ?? "_"} disabled={dis} onValueChange={(v) => set("categoria_id", v === "_" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">—</SelectItem>
                  {(categorie.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.parent_id ? `${categorie.data?.find((p) => p.id === c.parent_id)?.nome ?? ""} › ` : ""}{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Fornitore abituale" className="sm:col-span-2">
              <SceltaSoggetto ruolo="fornitore" valore={a.fornitore_id} disabled={dis} onChange={(v) => set("fornitore_id", v)} placeholder="—" />
            </Campo>
            <Campo label="Scorta minima"><CampoNumero valore={a.scorta_minima} disabled={dis} onChange={(n) => set("scorta_minima", n ?? 0)} /></Campo>
            <Campo label="Ricarico % (fuori listino)"><CampoNumero valore={a.ricarico} vuotoNull decimali={2} disabled={dis} onChange={(n) => set("ricarico", n)} /></Campo>
            {perms.vedere_costi && (
              <Campo label="Costo ultimo">
                <CampoNumero valore={nuovoCosto} vuotoNull decimali={4} disabled={dis} onChange={setNuovoCosto} />
              </Campo>
            )}
            <div className="flex flex-col justify-end gap-2 sm:col-span-4 sm:flex-row sm:items-center sm:gap-6">
              <label className="flex items-center gap-2 text-sm"><Switch checked={a.gestione_lotti} disabled={dis} onCheckedChange={(v) => set("gestione_lotti", v)} /> Gestione lotti</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={a.gestione_scadenze} disabled={dis} onCheckedChange={(v) => set("gestione_scadenze", v)} /> Scadenza obbligatoria</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={a.attivo} disabled={dis} onCheckedChange={(v) => set("attivo", v)} /> Attivo</label>
            </div>
            <Campo label="Note" className="sm:col-span-4"><Textarea rows={2} value={a.note ?? ""} disabled={dis} onChange={(e) => set("note", e.target.value || null)} /></Campo>
          </div>
        </section>

        <section className="space-y-3">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Giacenza</p>
            <p className="tabular text-3xl font-semibold">{formatNum(qtaTot)} <span className="text-base font-normal text-muted-foreground">{a.um}</span></p>
            {a.scorta_minima > 0 && qtaTot < a.scorta_minima && <p className="text-sm text-destructive">Sotto la scorta minima ({formatNum(a.scorta_minima)})</p>}
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="mb-2 text-sm font-semibold">Prezzi nei listini</p>
            {(prezzi.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">In nessun listino: prezzo da ricarico sul costo.</p>}
            {(prezzi.data ?? []).map((p) => (
              <Link key={p.id} to="/listini/$id" params={{ id: p.listini!.id }} className="flex justify-between py-0.5 text-sm hover:underline">
                <span className="truncate">{p.listini?.soggetti?.ragione_sociale ?? p.listini?.nome}{Number(p.qta_minima) > 0 ? ` (da ${formatNum(p.qta_minima)})` : ""}</span>
                <span className="tabular">{formatPrezzo(p.prezzo)}{Number(p.sconto) ? ` -${formatNum(p.sconto)}%` : ""}</span>
              </Link>
            ))}
          </div>
          {codici.data && codici.data.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <p className="mb-2 text-sm font-semibold">Codici fornitore</p>
              {codici.data.map((c) => (
                <div key={c.id} className="flex justify-between gap-2 py-0.5 text-sm">
                  <span className="truncate">{c.soggetti?.ragione_sociale} · <span className="font-mono text-xs">{c.codice}</span></span>
                  <span className="tabular">{formatPrezzo(c.ultimo_prezzo)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-lg font-semibold">Lotti in giacenza</h2>
          <div className="divide-y rounded-lg border bg-card text-sm">
            {(lotti.data ?? []).map((l) => (
              <div key={`${l.lotto_id}-${l.magazzino_id}`} className="flex items-center gap-3 px-3 py-2">
                <span className="font-mono">{l.codice}</span>
                {l.scadenza && l.scadenza < oggi() && <Stato stato="scaduto" />}
                <span className="ml-auto tabular">{formatNum(l.qta)} {l.um}</span>
                <span className="tabular w-24 text-right text-muted-foreground">{formatData(l.scadenza)}</span>
              </div>
            ))}
            {senzaLotto !== 0 && (
              <div className="flex items-center gap-3 px-3 py-2 text-muted-foreground">
                <span>Senza lotto</span><span className="ml-auto tabular">{formatNum(senzaLotto)} {a.um}</span><span className="w-24" />
              </div>
            )}
            {!lotti.data?.length && !senzaLotto && <p className="p-3 text-muted-foreground">Nessuna giacenza.</p>}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold">Ultimi movimenti</h2>
          <div className="max-h-96 divide-y overflow-y-auto rounded-lg border bg-card text-sm">
            {(movimenti.data ?? []).map((m) => {
              const d = m.ddt_righe?.ddt;
              return (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="tabular w-20">{formatData(m.data)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      {d ? <Link to="/ddt/$id" params={{ id: d.id }} className="hover:underline">{CAUSALI[m.causale]} · DDT {d.numero} {d.soggetti?.ragione_sociale}</Link> : `${CAUSALI[m.causale]}${m.nota ? ` · ${m.nota}` : ""}`}
                    </p>
                    {m.lotti && <p className="text-xs text-muted-foreground">lotto {m.lotti.codice}</p>}
                  </div>
                  <span className={`tabular ${Number(m.qta) < 0 ? "text-destructive" : "text-emerald-700"}`}>{Number(m.qta) > 0 ? "+" : ""}{formatNum(m.qta)}</span>
                </div>
              );
            })}
            {!movimenti.data?.length && <p className="p-3 text-muted-foreground">Nessun movimento.</p>}
          </div>
        </section>
      </div>
      {perms.vedere_costi && costo.data && (
        <p className="mt-4 text-xs text-muted-foreground">Costo ultimo {formatEuro(Number(costo.data.costo_ultimo))} aggiornato il {formatData(costo.data.aggiornato_il)}. Il costo medio ponderato dei carichi si usa per i margini.</p>
      )}
    </Pagina>
  );
}
