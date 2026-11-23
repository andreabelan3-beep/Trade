import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, SlidersHorizontal } from "lucide-react";
import { Pagina } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, CampoNumero } from "@/components/comuni/Campi";
import { SceltaArticolo, useMagazzini, type ArticoloBreve } from "@/components/comuni/Scelte";
import { Stato, Vuoto } from "@/components/comuni/Stato";
import { filtroTesto, ok, supabase } from "@/lib/dati";
import { formatData, formatNum, messaggioErrore, oggi, traGiorni } from "@/lib/formato";

type Scheda = "giacenze" | "lotti" | "movimenti";
type Search = { scheda?: Scheda };

export const Route = createFileRoute("/_authenticated/magazzino")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    scheda: s["scheda"] === "lotti" || s["scheda"] === "movimenti" ? s["scheda"] : "giacenze",
  }),
  head: () => ({ meta: [{ title: "Magazzino — Trade" }] }),
  component: Magazzino,
});

const CAUSALI: Record<string, string> = {
  acquisto: "Acquisto", vendita: "Vendita", reso_cliente: "Reso cliente", reso_fornitore: "Reso fornitore",
  conto_visione: "Conto visione", omaggio: "Omaggio", rettifica: "Rettifica", inventario: "Inventario",
};

function Magazzino() {
  const { scheda = "giacenze" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { perms } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const [soloSotto, setSoloSotto] = useState(false);
  const [entroGiorni, setEntroGiorni] = useState("90");
  const [rettifica, setRettifica] = useState(false);

  const giacenze = useQuery({
    queryKey: ["magazzino", "giacenze", q],
    enabled: scheda === "giacenze",
    queryFn: async () => {
      let r = supabase.from("giacenze_articoli").select("*");
      const f = filtroTesto(q, ["codice", "descrizione"]);
      if (f) r = r.or(f);
      return ok(await r.order("codice").limit(1000));
    },
  });
  const lotti = useQuery({
    queryKey: ["magazzino", "lotti", entroGiorni, q],
    enabled: scheda === "lotti",
    queryFn: async () => {
      let r = supabase.from("lotti_giacenza").select("*").gt("qta", 0);
      if (entroGiorni !== "tutti") r = r.lte("scadenza", traGiorni(Number(entroGiorni)));
      const f = filtroTesto(q, ["articolo_codice", "articolo_descrizione", "codice"]);
      if (f) r = r.or(f);
      return ok(await r.order("scadenza", { nullsFirst: false }).limit(1000));
    },
  });
  const movimenti = useQuery({
    queryKey: ["magazzino", "movimenti", "tutti"],
    enabled: scheda === "movimenti",
    queryFn: async () =>
      ok(await supabase.from("movimenti").select("id, data, qta, causale, nota, articoli(id, codice, descrizione, um), lotti(codice), ddt_righe(ddt(id, numero, soggetti(ragione_sociale)))")
        .order("creato_il", { ascending: false }).limit(300)),
  });

  const righeGiac = (giacenze.data ?? []).filter((g) => !soloSotto || (Number(g.scorta_minima) > 0 && Number(g.qta) < Number(g.scorta_minima)));

  return (
    <Pagina titolo="Magazzino" largo azioni={perms.gestire_magazzino && <Button variant="outline" onClick={() => setRettifica(true)}><SlidersHorizontal className="mr-1 h-4 w-4" /> Rettifica / inventario</Button>}>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={scheda} onValueChange={(v) => navigate({ search: { scheda: v as Scheda } })}>
          <TabsList>
            <TabsTrigger value="giacenze">Giacenze</TabsTrigger>
            <TabsTrigger value="lotti">Lotti e scadenze</TabsTrigger>
            <TabsTrigger value="movimenti">Movimenti</TabsTrigger>
          </TabsList>
        </Tabs>
        {scheda !== "movimenti" && (
          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Codice, descrizione, lotto" className="pl-9" />
          </div>
        )}
        {scheda === "giacenze" && <label className="flex items-center gap-2 text-sm"><Switch checked={soloSotto} onCheckedChange={setSoloSotto} /> Solo sotto scorta</label>}
        {scheda === "lotti" && (
          <Select value={entroGiorni} onValueChange={setEntroGiorni}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Già scaduti</SelectItem>
              <SelectItem value="30">Scadono entro 30 giorni</SelectItem>
              <SelectItem value="90">Scadono entro 90 giorni</SelectItem>
              <SelectItem value="tutti">Tutti i lotti</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="mt-4">
        {scheda === "giacenze" && (righeGiac.length ? (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium"><th>Codice</th><th>Descrizione</th><th className="!text-right">Giacenza</th><th className="!text-right">Scorta min.</th><th>Prima scadenza</th></tr>
              </thead>
              <tbody>
                {righeGiac.map((g) => (
                  <tr key={g.articolo_id} className="border-t [&>td]:px-3 [&>td]:py-2">
                    <td className="font-mono text-xs"><Link to="/articoli/$id" params={{ id: g.articolo_id! }} className="hover:underline">{g.codice}</Link></td>
                    <td>{g.descrizione}</td>
                    <td className={`tabular text-right ${Number(g.qta) < 0 || (Number(g.scorta_minima) > 0 && Number(g.qta) < Number(g.scorta_minima)) ? "font-semibold text-destructive" : ""}`}>{formatNum(g.qta)} {g.um}</td>
                    <td className="tabular text-right text-muted-foreground">{Number(g.scorta_minima) ? formatNum(g.scorta_minima) : ""}</td>
                    <td className={`tabular ${g.prima_scadenza && g.prima_scadenza < oggi() ? "text-destructive" : ""}`}>{formatData(g.prima_scadenza)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Vuoto>Nessun articolo.</Vuoto>)}

        {scheda === "lotti" && ((lotti.data ?? []).length ? (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium"><th>Scadenza</th><th>Articolo</th><th>Lotto</th><th className="!text-right">Quantità</th><th /></tr>
              </thead>
              <tbody>
                {(lotti.data ?? []).map((l) => (
                  <tr key={`${l.lotto_id}-${l.magazzino_id}`} className="border-t [&>td]:px-3 [&>td]:py-2">
                    <td className="tabular">{formatData(l.scadenza)}</td>
                    <td><Link to="/articoli/$id" params={{ id: l.articolo_id! }} className="hover:underline">{l.articolo_codice} · {l.articolo_descrizione}</Link></td>
                    <td className="font-mono">{l.codice}</td>
                    <td className="tabular text-right">{formatNum(l.qta)} {l.um}</td>
                    <td>{l.scadenza && (l.scadenza < oggi() ? <Stato stato="scaduto" /> : l.scadenza <= traGiorni(30) ? <Stato stato="in_scadenza" /> : null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Vuoto>Nessun lotto in questo intervallo.</Vuoto>)}

        {scheda === "movimenti" && ((movimenti.data ?? []).length ? (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium"><th>Data</th><th>Articolo</th><th>Lotto</th><th>Causale</th><th>Documento</th><th className="!text-right">Qtà</th></tr>
              </thead>
              <tbody>
                {(movimenti.data ?? []).map((m) => {
                  const d = m.ddt_righe?.ddt;
                  return (
                    <tr key={m.id} className="border-t [&>td]:px-3 [&>td]:py-2">
                      <td className="tabular">{formatData(m.data)}</td>
                      <td>{m.articoli && <Link to="/articoli/$id" params={{ id: m.articoli.id }} className="hover:underline">{m.articoli.codice} · {m.articoli.descrizione}</Link>}</td>
                      <td className="font-mono text-xs">{m.lotti?.codice}</td>
                      <td>{CAUSALI[m.causale]}</td>
                      <td>{d ? <Link to="/ddt/$id" params={{ id: d.id }} className="hover:underline">DDT {d.numero} {d.soggetti?.ragione_sociale}</Link> : <span className="text-muted-foreground">{m.nota}</span>}</td>
                      <td className={`tabular text-right ${Number(m.qta) < 0 ? "text-destructive" : "text-emerald-700"}`}>{Number(m.qta) > 0 ? "+" : ""}{formatNum(m.qta)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <Vuoto>Nessun movimento.</Vuoto>)}
      </div>
      {rettifica && <DialogRettifica vediCosti={perms.vedere_costi} onClose={() => setRettifica(false)} />}
    </Pagina>
  );
}

function DialogRettifica({ onClose, vediCosti }: { onClose: () => void; vediCosti: boolean }) {
  const qc = useQueryClient();
  const magazzini = useMagazzini();
  const [art, setArt] = useState<ArticoloBreve | null>(null);
  const [mag, setMag] = useState<string>("");
  const [modo, setModo] = useState<"variazione" | "conteggio">("conteggio");
  const [qta, setQta] = useState<number | null>(null);
  const [lotto, setLotto] = useState("");
  const [scadenza, setScadenza] = useState("");
  const [nota, setNota] = useState("");
  const [costo, setCosto] = useState<number | null>(null);
  const magazzino = mag || magazzini.data?.find((m) => m.predefinito)?.id || "";
  const attuale = useQuery({
    queryKey: ["magazzino", "attuale", art?.id, magazzino, lotto],
    enabled: !!art && !!magazzino,
    queryFn: async () => {
      if (lotto.trim()) {
        const g = ok(await supabase.from("lotti_giacenza").select("qta").eq("articolo_id", art!.id).eq("magazzino_id", magazzino).eq("codice", lotto.trim()));
        return g.reduce((t, x) => t + Number(x.qta), 0);
      }
      const g = ok(await supabase.from("giacenze").select("qta").eq("articolo_id", art!.id).eq("magazzino_id", magazzino).is("lotto_id", null));
      return g.reduce((t, x) => t + Number(x.qta), 0);
    },
  });
  const delta = qta === null ? null : modo === "variazione" ? qta : qta - Number(attuale.data ?? 0);
  const salva = useMutation({
    mutationFn: async () => {
      if (!art || !magazzino || !delta) throw new Error("Niente da rettificare");
      ok(await supabase.rpc("rettifica_magazzino", {
        _articolo: art.id, _magazzino: magazzino, _qta: delta,
        _nota: nota || (modo === "conteggio" ? "Inventario" : "Rettifica"), _inventario: modo === "conteggio",
        ...(lotto.trim() ? { _lotto: lotto.trim() } : {}),
        ...(scadenza ? { _scadenza: scadenza } : {}),
        ...(costo !== null ? { _costo: costo } : {}),
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["magazzino"] });
      qc.invalidateQueries({ queryKey: ["articoli"] });
      toast.success("Magazzino aggiornato");
      onClose();
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Rettifica di magazzino</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <SceltaArticolo etichetta={art ? `${art.codice} · ${art.descrizione}` : "Scegli l'articolo"} onScelto={setArt} className="w-full justify-start" />
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Magazzino">
              <Select value={magazzino} onValueChange={setMag}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(magazzini.data ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
              </Select>
            </Campo>
            <Campo label="Tipo">
              <Select value={modo} onValueChange={(v) => setModo(v as typeof modo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conteggio">Quantità contata</SelectItem>
                  <SelectItem value="variazione">Variazione (+/−)</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo label={art?.gestione_lotti ? "Lotto (obbligatorio)" : "Lotto"}><Input value={lotto} onChange={(e) => setLotto(e.target.value)} /></Campo>
            <Campo label="Scadenza lotto"><Input type="date" value={scadenza} onChange={(e) => setScadenza(e.target.value)} /></Campo>
            <Campo label={modo === "conteggio" ? "Quantità contata" : "Variazione"}><CampoNumero valore={qta} vuotoNull onChange={setQta} /></Campo>
            {vediCosti && <Campo label="Costo unitario (se carico)"><CampoNumero valore={costo} vuotoNull decimali={4} onChange={setCosto} /></Campo>}
            <Campo label="Nota" className="col-span-2"><Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="es. rottura, inventario di fine anno" /></Campo>
          </div>
          {art && <p className="text-sm text-muted-foreground">Ora in giacenza{lotto ? ` (lotto ${lotto})` : art.gestione_lotti ? " (senza lotto)" : ""}: {formatNum(attuale.data ?? 0)} {art.um}{delta !== null ? ` → movimento ${delta > 0 ? "+" : ""}${formatNum(delta)}` : ""}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={() => salva.mutate()} disabled={!art || !delta || salva.isPending}>Registra</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
