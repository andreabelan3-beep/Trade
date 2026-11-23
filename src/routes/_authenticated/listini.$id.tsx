import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Pagina } from "@/components/app/AppShell";
import { Percorso } from "@/components/app/Percorso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, CampoNumero } from "@/components/comuni/Campi";
import { SceltaArticolo, SceltaSoggetto } from "@/components/comuni/Scelte";
import { ok, supabase } from "@/lib/dati";
import { formatPrezzo, messaggioErrore, tondo } from "@/lib/formato";
import type { Database } from "@/integrations/supabase/types";

type Listino = Database["public"]["Tables"]["listini"]["Row"];

export const Route = createFileRoute("/_authenticated/listini/$id")({
  head: () => ({ meta: [{ title: "Listino — Trade" }] }),
  component: SchedaListino,
});

function SchedaListino() {
  const { id } = Route.useParams();
  const { perms } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const dis = !perms.gestire_listini;
  const listino = useQuery({ queryKey: ["listini", id], queryFn: async () => ok(await supabase.from("listini").select("*").eq("id", id).single()) });
  const prezzi = useQuery({
    queryKey: ["listini_prezzi", id],
    queryFn: async () =>
      ok(await supabase.from("listini_prezzi").select("id, prezzo, sconto, qta_minima, articolo_id, articoli(codice, descrizione, um)").eq("listino_id", id).order("articolo_id")),
  });
  const costi = useQuery({
    queryKey: ["articoli_costi", "tutti"],
    enabled: perms.vedere_costi,
    queryFn: async () => ok(await supabase.from("articoli_costi").select("articolo_id, costo_ultimo")),
  });
  const costoDi = (a: string) => Number(costi.data?.find((c) => c.articolo_id === a)?.costo_ultimo ?? 0);
  const [l, setL] = useState<Listino | null>(null);
  const [massa, setMassa] = useState<null | "ricarico" | "aumento">(null);
  useEffect(() => { if (listino.data) setL(listino.data); }, [listino.data]);
  const invalida = () => qc.invalidateQueries({ queryKey: ["listini_prezzi"] });

  const salva = useMutation({
    mutationFn: async () => {
      if (!l) return;
      ok(await supabase.from("listini").update({
        nome: l.nome, soggetto_id: l.soggetto_id, ricarico: l.ricarico, valido_dal: l.valido_dal, valido_al: l.valido_al,
        attivo: l.attivo, predefinito: l.predefinito, note: l.note,
      }).eq("id", id));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["listini"] }); toast.success("Listino salvato"); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const cambiaPrezzo = useMutation({
    mutationFn: async (p: { id: string; prezzo?: number; sconto?: number; qta_minima?: number }) => {
      const { id: pid, ...dati } = p;
      ok(await supabase.from("listini_prezzi").update(dati).eq("id", pid));
    },
    onSuccess: invalida,
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const aggiungi = useMutation({
    mutationFn: async (articolo: string) => {
      const prezzo = perms.vedere_costi && l?.ricarico !== null ? tondo(costoDi(articolo) * (1 + Number(l?.ricarico ?? 0) / 100), 4) : 0;
      ok(await supabase.from("listini_prezzi").insert({ listino_id: id, articolo_id: articolo, prezzo }));
    },
    onSuccess: invalida,
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const togli = useMutation({
    mutationFn: async (pid: string) => ok(await supabase.from("listini_prezzi").delete().eq("id", pid)),
    onSuccess: invalida,
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const elimina = useMutation({
    mutationFn: async () => ok(await supabase.from("listini").delete().eq("id", id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["listini"] }); navigate({ to: "/listini" }); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });

  if (!l) return <Pagina titolo="Listino">Caricamento…</Pagina>;
  return (
    <Pagina titolo={l.nome} largo
      percorso={<Percorso><Link to="/listini">Listini</Link><span>{l.nome}</span></Percorso>}
      azioni={!dis && (
        <>
          {perms.vedere_costi && <Button variant="outline" onClick={() => setMassa("ricarico")}>Aggiungi articoli con ricarico</Button>}
          <Button variant="outline" onClick={() => setMassa("aumento")}>Aumenta/diminuisci prezzi</Button>
          <Button onClick={() => salva.mutate()}>Salva</Button>
        </>
      )}>
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-6">
        <Campo label="Nome" className="sm:col-span-2"><Input value={l.nome} disabled={dis} onChange={(e) => setL({ ...l, nome: e.target.value })} /></Campo>
        <Campo label="Dedicato al cliente" className="sm:col-span-2">
          <SceltaSoggetto ruolo="cliente" valore={l.soggetto_id} disabled={dis || l.predefinito} onChange={(v) => setL({ ...l, soggetto_id: v })} placeholder="Listino generale" />
        </Campo>
        <Campo label="Ricarico % fuori elenco"><CampoNumero valore={l.ricarico} vuotoNull decimali={2} disabled={dis} onChange={(n) => setL({ ...l, ricarico: n })} /></Campo>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm"><Switch checked={l.attivo} disabled={dis} onCheckedChange={(v) => setL({ ...l, attivo: v })} /> Attivo</label>
          {!l.soggetto_id && <label className="flex items-center gap-2 text-sm"><Switch checked={l.predefinito} disabled={dis} onCheckedChange={(v) => setL({ ...l, predefinito: v })} /> Predefinito</label>}
        </div>
        <Campo label="Valido dal" className="sm:col-span-2"><Input type="date" value={l.valido_dal ?? ""} disabled={dis} onChange={(e) => setL({ ...l, valido_dal: e.target.value || null })} /></Campo>
        <Campo label="Valido al" className="sm:col-span-2"><Input type="date" value={l.valido_al ?? ""} disabled={dis} onChange={(e) => setL({ ...l, valido_al: e.target.value || null })} /></Campo>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Prezzi ({prezzi.data?.length ?? 0})</h2>
        {!dis && <SceltaArticolo etichetta="+ Articolo" onScelto={(a) => aggiungi.mutate(a.id)} />}
      </div>
      <div className="mt-2 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
              <th>Codice</th><th>Descrizione</th><th className="w-28 !text-right">Da qtà</th><th className="w-32 !text-right">Prezzo</th><th className="w-24 !text-right">Sconto %</th>
              {perms.vedere_costi && <th className="w-36 !text-right">Costo · ricarico</th>}
              {!dis && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {(prezzi.data ?? [])
              .slice()
              .sort((x, y) => (x.articoli?.codice ?? "").localeCompare(y.articoli?.codice ?? "") || Number(x.qta_minima) - Number(y.qta_minima))
              .map((p) => {
                const c = costoDi(p.articolo_id);
                const netto = Number(p.prezzo) * (1 - Number(p.sconto) / 100);
                return (
                  <tr key={p.id} className="border-t [&>td]:px-2 [&>td]:py-1">
                    <td className="px-3 font-mono text-xs"><Link to="/articoli/$id" params={{ id: p.articolo_id }} className="hover:underline">{p.articoli?.codice}</Link></td>
                    <td>{p.articoli?.descrizione} <span className="text-xs text-muted-foreground">{p.articoli?.um}</span></td>
                    <td><CampoNumero valore={Number(p.qta_minima)} disabled={dis} className="h-8" onChange={(n) => cambiaPrezzo.mutate({ id: p.id, qta_minima: n ?? 0 })} /></td>
                    <td><CampoNumero valore={Number(p.prezzo)} decimali={4} disabled={dis} className="h-8" onChange={(n) => cambiaPrezzo.mutate({ id: p.id, prezzo: n ?? 0 })} /></td>
                    <td><CampoNumero valore={Number(p.sconto)} decimali={2} disabled={dis} className="h-8" onChange={(n) => cambiaPrezzo.mutate({ id: p.id, sconto: n ?? 0 })} /></td>
                    {perms.vedere_costi && (
                      <td className={`tabular text-right text-xs ${c > 0 && netto < c ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                        {c > 0 ? `${formatPrezzo(c)} · ${Math.round((netto / c - 1) * 1000) / 10}%` : "—"}
                      </td>
                    )}
                    {!dis && <td><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => togli.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td>}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {!dis && !l.predefinito && (
        <Button variant="ghost" className="mt-6 text-destructive" onClick={() => window.confirm("Eliminare il listino e tutti i suoi prezzi?") && elimina.mutate()}>Elimina listino</Button>
      )}
      {massa && (
        <OperazioneMassa tipo={massa} listinoId={id} ricarico={l.ricarico} esistenti={(prezzi.data ?? []).map((p) => p.articolo_id)}
          costoDi={costoDi} onClose={() => { setMassa(null); invalida(); }} />
      )}
    </Pagina>
  );
}

function OperazioneMassa({ tipo, listinoId, ricarico, esistenti, costoDi, onClose }: {
  tipo: "ricarico" | "aumento"; listinoId: string; ricarico: number | null; esistenti: string[];
  costoDi: (a: string) => number; onClose: () => void;
}) {
  const [perc, setPerc] = useState<number | null>(tipo === "ricarico" ? (ricarico ?? 30) : 3);
  const [busy, setBusy] = useState(false);
  async function esegui() {
    if (perc === null) return;
    setBusy(true);
    try {
      if (tipo === "ricarico") {
        const art = ok(await supabase.from("articoli").select("id").eq("attivo", true));
        const nuovi = art.filter((a) => !esistenti.includes(a.id) && costoDi(a.id) > 0)
          .map((a) => ({ listino_id: listinoId, articolo_id: a.id, prezzo: tondo(costoDi(a.id) * (1 + perc / 100), 4) }));
        for (let i = 0; i < nuovi.length; i += 500) ok(await supabase.from("listini_prezzi").insert(nuovi.slice(i, i + 500)));
        toast.success(`${nuovi.length} articoli aggiunti (quelli senza costo sono stati saltati)`);
      } else {
        const righe = ok(await supabase.from("listini_prezzi").select("id, prezzo").eq("listino_id", listinoId));
        for (const r of righe) ok(await supabase.from("listini_prezzi").update({ prezzo: tondo(Number(r.prezzo) * (1 + perc / 100), 4) }).eq("id", r.id));
        toast.success(`${righe.length} prezzi aggiornati`);
      }
      onClose();
    } catch (e) {
      toast.error(messaggioErrore(e));
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{tipo === "ricarico" ? "Aggiungi gli articoli mancanti" : "Variazione dei prezzi"}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          {tipo === "ricarico"
            ? "Aggiunge al listino tutti gli articoli attivi non ancora presenti, con prezzo = costo ultimo × (1 + ricarico)."
            : "Applica la percentuale a tutti i prezzi del listino (negativa per diminuire)."}
        </p>
        <Campo label={tipo === "ricarico" ? "Ricarico %" : "Variazione %"}><CampoNumero valore={perc} vuotoNull decimali={2} onChange={setPerc} /></Campo>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={() => void esegui()} disabled={busy || perc === null}>{busy ? "In corso…" : "Applica"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
