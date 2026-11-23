import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Pagina } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, CampoNumero } from "@/components/comuni/Campi";
import { Vuoto } from "@/components/comuni/Stato";
import { filtroTesto, ok, supabase } from "@/lib/dati";
import { formatNum, messaggioErrore } from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/articoli/")({
  head: () => ({ meta: [{ title: "Articoli — Trade" }] }),
  component: Articoli,
});

function Articoli() {
  const { perms } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const [nuovo, setNuovo] = useState(false);
  const lista = useQuery({
    queryKey: ["articoli", "elenco", q],
    queryFn: async () => {
      let r = supabase.from("giacenze_articoli").select("*");
      const f = filtroTesto(q, ["codice", "descrizione"]);
      if (f) r = r.or(f);
      return ok(await r.order("codice").limit(300));
    },
  });
  return (
    <Pagina titolo="Articoli" azioni={perms.gestire_articoli && <Button onClick={() => setNuovo(true)}><Plus className="mr-1 h-4 w-4" /> Nuovo articolo</Button>}>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca codice o descrizione…" className="pl-9" />
      </div>
      <div className="mt-4">
        {lista.data?.length === 0 && <Vuoto>Nessun articolo{q ? " trovato" : ": crea il primo o registra un DDT di un fornitore"}.</Vuoto>}
        {!!lista.data?.length && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  <th>Codice</th><th>Descrizione</th><th className="!text-right">Giacenza</th><th className="!text-right">Scorta min.</th><th>Prima scadenza</th>
                </tr>
              </thead>
              <tbody>
                {lista.data.map((a) => (
                  <tr key={a.articolo_id} className="border-t hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2">
                    <td className="font-mono text-xs"><Link to="/articoli/$id" params={{ id: a.articolo_id! }} className="hover:underline">{a.codice}</Link></td>
                    <td><Link to="/articoli/$id" params={{ id: a.articolo_id! }} className="hover:underline">{a.descrizione}</Link></td>
                    <td className={`tabular text-right ${Number(a.scorta_minima) > 0 && Number(a.qta) < Number(a.scorta_minima) ? "font-semibold text-destructive" : ""}`}>
                      {formatNum(a.qta)} {a.um}
                    </td>
                    <td className="tabular text-right text-muted-foreground">{Number(a.scorta_minima) ? formatNum(a.scorta_minima) : ""}</td>
                    <td className="tabular">{a.prima_scadenza ? a.prima_scadenza.split("-").reverse().join("/") : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {nuovo && <NuovoArticolo onClose={() => setNuovo(false)} />}
    </Pagina>
  );
}

function NuovoArticolo({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [a, setA] = useState({ codice: "", descrizione: "", um: "PZ", iva: 22, gestione_lotti: false, gestione_scadenze: false, ean: "" });
  const crea = useMutation({
    mutationFn: async () =>
      ok(await supabase.from("articoli").insert({ ...a, ean: a.ean || null, codice: a.codice.trim(), descrizione: a.descrizione.trim() }).select("id").single()).id,
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["articoli"] });
      navigate({ to: "/articoli/$id", params: { id } });
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuovo articolo</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-4">
          <Campo label="Codice" className="sm:col-span-2"><Input value={a.codice} onChange={(e) => setA({ ...a, codice: e.target.value })} /></Campo>
          <Campo label="EAN" className="sm:col-span-2"><Input value={a.ean} onChange={(e) => setA({ ...a, ean: e.target.value })} /></Campo>
          <Campo label="Descrizione" className="sm:col-span-4"><Input value={a.descrizione} onChange={(e) => setA({ ...a, descrizione: e.target.value })} /></Campo>
          <Campo label="UM"><Input value={a.um} onChange={(e) => setA({ ...a, um: e.target.value.toUpperCase() })} /></Campo>
          <Campo label="IVA %"><CampoNumero valore={a.iva} decimali={2} onChange={(n) => setA({ ...a, iva: n ?? 22 })} /></Campo>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><Switch checked={a.gestione_lotti} onCheckedChange={(v) => setA({ ...a, gestione_lotti: v })} /> Gestione lotti</label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><Switch checked={a.gestione_scadenze} onCheckedChange={(v) => setA({ ...a, gestione_scadenze: v })} /> Data di scadenza obbligatoria</label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={() => crea.mutate()} disabled={crea.isPending || !a.codice.trim() || !a.descrizione.trim()}>Crea</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
