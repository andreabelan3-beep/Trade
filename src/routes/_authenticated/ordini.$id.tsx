import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Printer, Truck } from "lucide-react";
import { Pagina } from "@/components/app/AppShell";
import { Percorso } from "@/components/app/Percorso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, CampoNumero } from "@/components/comuni/Campi";
import { SceltaSoggetto, usePagamenti } from "@/components/comuni/Scelte";
import { Stato } from "@/components/comuni/Stato";
import { EditorRighe, salvaRighe, type RigaDoc } from "@/components/documenti/EditorRighe";
import { ok, supabase } from "@/lib/dati";
import { formatData, formatNum, messaggioErrore } from "@/lib/formato";
import { apriPdf, creaPdfDocumento } from "@/lib/documento-pdf";
import { indirizzoSoggetto, intestazioneAzienda } from "@/lib/azienda";
import type { Database } from "@/integrations/supabase/types";

type Ordine = Database["public"]["Tables"]["ordini"]["Row"];

export const Route = createFileRoute("/_authenticated/ordini/$id")({
  head: () => ({ meta: [{ title: "Ordine — Trade" }] }),
  component: EditorOrdine,
});

function EditorOrdine() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const ordine = useQuery({ queryKey: ["ordini", id], queryFn: async () => ok(await supabase.from("ordini").select("*").eq("id", id).single()) });
  const evasione = useQuery({ queryKey: ["ordini", id, "elenco"], queryFn: async () => ok(await supabase.from("ordini_elenco").select("evasione").eq("id", id).single()) });
  const righeQ = useQuery({
    queryKey: ["ordini", id, "righe"],
    queryFn: async () => ok(await supabase.from("ordini_righe_evasione").select("*").eq("ordine_id", id).order("posizione")),
  });
  const ddtCollegati = useQuery({
    queryKey: ["ordini", id, "ddt"],
    queryFn: async () => {
      const ids = (righeQ.data ?? []).map((r) => r.id!);
      if (!ids.length) return [];
      const r = ok(await supabase.from("ddt_righe").select("ddt(id, numero, data, stato)").in("ordine_riga_id", ids));
      const m = new Map<string, NonNullable<(typeof r)[number]["ddt"]>>();
      for (const x of r) if (x.ddt) m.set(x.ddt.id, x.ddt);
      return [...m.values()];
    },
    enabled: righeQ.isSuccess,
  });
  const destinazioni = useQuery({
    queryKey: ["destinazioni", ordine.data?.soggetto_id],
    enabled: !!ordine.data?.soggetto_id,
    queryFn: async () => ok(await supabase.from("destinazioni").select("*").eq("soggetto_id", ordine.data!.soggetto_id).order("nome")),
  });
  const pagamenti = usePagamenti();

  const [o, setO] = useState<Ordine | null>(null);
  const [righe, setRighe] = useState<RigaDoc[]>([]);
  const [modificato, setModificato] = useState(false);
  const [evadi, setEvadi] = useState(false);
  useEffect(() => { if (ordine.data) { setO(ordine.data); setModificato(false); } }, [ordine.data]);
  useEffect(() => {
    if (righeQ.data) setRighe(righeQ.data.map((r) => ({
      id: r.id!, articolo_id: r.articolo_id, codice: r.codice, descrizione: r.descrizione ?? "", um: r.um ?? "PZ",
      qta: Number(r.qta), prezzo: Number(r.prezzo), sconto: Number(r.sconto), iva: Number(r.iva), data_consegna: r.data_consegna,
    })));
  }, [righeQ.data]);
  const stato = useMemo(() => new Map((righeQ.data ?? []).map((r) => [r.id!, r])), [righeQ.data]);

  const ricarica = () => { qc.invalidateQueries({ queryKey: ["ordini"] }); qc.invalidateQueries({ queryKey: ["cruscotto"] }); };
  async function salvaTutto() {
    if (!o) return;
    ok(await supabase.from("ordini").update({
      soggetto_id: o.soggetto_id, data: o.data, riferimento: o.riferimento, data_consegna: o.data_consegna,
      destinazione_id: o.destinazione_id, pagamento_id: o.pagamento_id, note: o.note, note_interne: o.note_interne,
    }).eq("id", id));
    await salvaRighe("ordini_righe", "ordine_id", id, righe, (righeQ.data ?? []).map((r) => r.id!), ["data_consegna"]);
  }
  const salva = useMutation({
    mutationFn: salvaTutto,
    onSuccess: () => { ricarica(); toast.success("Ordine salvato"); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const cambiaStato = useMutation({
    mutationFn: async (s: string) => ok(await supabase.rpc("stato_ordine", { _id: id, _stato: s })),
    onSuccess: ricarica,
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const residuo = useMutation({
    mutationFn: async (p: { riga: string; chiusa: boolean }) => ok(await supabase.rpc("chiudi_residuo", { _riga: p.riga, _chiusa: p.chiusa })),
    onSuccess: ricarica,
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const elimina = useMutation({
    mutationFn: async () => ok(await supabase.from("ordini").delete().eq("id", id)),
    onSuccess: () => { ricarica(); navigate({ to: "/ordini", search: { tipo: (o?.tipo ?? "cliente") as "cliente" | "fornitore" } }); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const stampa = useMutation({
    mutationFn: async () => {
      if (!o) return;
      if (modificato) await salvaTutto();
      const [az, sog] = await Promise.all([intestazioneAzienda(), supabase.from("soggetti").select("*").eq("id", o.soggetto_id).single()]);
      const bytes = await creaPdfDocumento({
        titolo: o.tipo === "cliente" ? "CONFERMA D'ORDINE" : "ORDINE A FORNITORE",
        sottotitolo: `N. ${o.numero} del ${formatData(o.data)}`,
        azienda: az,
        destinatario: { etichetta: o.tipo === "cliente" ? "Cliente" : "Fornitore", righe: sog.data ? indirizzoSoggetto(sog.data) : [] },
        info: [
          ["Vostro riferimento", o.riferimento ?? ""],
          ["Consegna", formatData(o.data_consegna)],
          ["Pagamento", pagamenti.data?.find((p) => p.id === (o.pagamento_id ?? sog.data?.pagamento_id))?.nome ?? ""],
        ],
        righe: righe.map((r) => ({ ...r, dettagli: r.data_consegna ? [`Consegna ${formatData(r.data_consegna)}`] : [] })),
        conPrezzi: true,
        note: o.note,
      });
      apriPdf(bytes, `Ordine-${o.numero?.replace("/", "-")}.pdf`);
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });

  if (!o) return <Pagina titolo="Ordine">Caricamento…</Pagina>;
  const aperto = o.stato === "confermato" || o.stato === "bozza";
  const cliente = o.tipo === "cliente";
  const set = <K extends keyof Ordine>(k: K, v: Ordine[K]) => { setO({ ...o, [k]: v }); setModificato(true); };
  const haResiduo = (righeQ.data ?? []).some((r) => Number(r.residuo) - Number(r.qta_in_bozza) > 0);

  return (
    <Pagina titolo={`Ordine ${cliente ? "cliente" : "fornitore"} ${o.numero}`} largo
      percorso={<Percorso><Link to="/ordini" search={{ tipo: o.tipo as "cliente" | "fornitore" }}>Ordini</Link><span>{o.numero}</span></Percorso>}
      azioni={
        <>
          {evasione.data && <Stato stato={evasione.data.evasione!} className="self-center" />}
          <Button variant="outline" onClick={() => stampa.mutate()}><Printer className="mr-1 h-4 w-4" /> Stampa</Button>
          {aperto && <Button variant="outline" onClick={() => salva.mutate()} disabled={salva.isPending}>Salva</Button>}
          {o.stato === "confermato" && haResiduo && (
            <Button onClick={async () => { if (modificato) { try { await salvaTutto(); ricarica(); } catch (e) { toast.error(messaggioErrore(e)); return; } } setEvadi(true); }}>
              <Truck className="mr-1 h-4 w-4" /> {cliente ? "Prepara DDT" : "Ricevi merce"}
            </Button>
          )}
        </>
      }>
      {modificato && <Alert className="mb-4"><AlertDescription>Modifiche non salvate.</AlertDescription></Alert>}
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-6">
        <Campo label={cliente ? "Cliente" : "Fornitore"} className="sm:col-span-3">
          <SceltaSoggetto ruolo={cliente ? "cliente" : "fornitore"} valore={o.soggetto_id} disabled={!aperto || (ddtCollegati.data?.length ?? 0) > 0}
            onChange={(v) => { if (v) { setO({ ...o, soggetto_id: v, destinazione_id: null }); setModificato(true); } }} />
        </Campo>
        <Campo label="Data"><Input type="date" value={o.data} disabled={!aperto} onChange={(e) => set("data", e.target.value)} /></Campo>
        <Campo label="Consegna richiesta"><Input type="date" value={o.data_consegna ?? ""} disabled={!aperto} onChange={(e) => set("data_consegna", e.target.value || null)} /></Campo>
        <Campo label={cliente ? "Rif. ordine cliente" : "Rif. conferma fornitore"}><Input value={o.riferimento ?? ""} disabled={!aperto} onChange={(e) => set("riferimento", e.target.value || null)} /></Campo>
        {cliente && (
          <Campo label="Destinazione" className="sm:col-span-2">
            <Select value={o.destinazione_id ?? "_"} disabled={!aperto} onValueChange={(v) => set("destinazione_id", v === "_" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Sede del cliente</SelectItem>
                {(destinazioni.data ?? []).map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Campo>
        )}
        <Campo label="Pagamento" className="sm:col-span-2">
          <Select value={o.pagamento_id ?? "_"} disabled={!aperto} onValueChange={(v) => set("pagamento_id", v === "_" ? null : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_">Da anagrafica</SelectItem>
              {(pagamenti.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="Note (stampate)" className="sm:col-span-3"><Textarea rows={2} value={o.note ?? ""} disabled={!aperto} onChange={(e) => set("note", e.target.value || null)} /></Campo>
        <Campo label="Note interne" className="sm:col-span-3"><Textarea rows={2} value={o.note_interne ?? ""} onChange={(e) => set("note_interne", e.target.value || null)} /></Campo>
      </div>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Righe</h2>
      <EditorRighe
        righe={righe}
        onChange={(r) => { setRighe(r); setModificato(true); }}
        bloccato={!aperto}
        tipoPrezzo={cliente ? "vendita" : "acquisto"}
        soggetto={o.soggetto_id}
        consegna
        extra={{
          titolo: "Evaso / residuo",
          cella: (r) => {
            const s = stato.get(r.id);
            if (!s) return <span className="text-xs text-muted-foreground">nuova</span>;
            return (
              <div className="text-xs">
                <p className="tabular">{formatNum(s.qta_evasa)} / <b>{formatNum(s.residuo)}</b>{Number(s.qta_in_bozza) ? ` (${formatNum(s.qta_in_bozza)} in bozza)` : ""}</p>
                {o.stato === "confermato" && (s.chiusa ? (
                  <button className="text-primary hover:underline" onClick={() => residuo.mutate({ riga: r.id, chiusa: false })}>Riapri residuo</button>
                ) : Number(s.residuo) > 0 && Number(s.qta_evasa) > 0 ? (
                  <button className="text-primary hover:underline" onClick={() => residuo.mutate({ riga: r.id, chiusa: true })}>Chiudi residuo</button>
                ) : null)}
                {s.chiusa && <p className="text-muted-foreground">residuo stralciato</p>}
              </div>
            );
          },
        }}
      />

      {(ddtCollegati.data?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">DDT collegati</h2>
          <div className="flex flex-wrap gap-2">
            {ddtCollegati.data!.map((x) => (
              <Link key={x.id} to="/ddt/$id" params={{ id: x.id }} className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-muted/50">
                {x.numero ?? "bozza"} del {formatData(x.data)} <Stato stato={x.stato} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        {o.stato === "confermato" && <Button variant="outline" onClick={() => window.confirm("Chiudere l'ordine? I residui non si evadono più.") && cambiaStato.mutate("chiuso")}>Chiudi ordine</Button>}
        {(o.stato === "chiuso" || o.stato === "annullato") && <Button variant="outline" onClick={() => cambiaStato.mutate("confermato")}>Riapri ordine</Button>}
        {o.stato === "confermato" && <Button variant="ghost" className="text-destructive" onClick={() => window.confirm("Annullare l'ordine?") && cambiaStato.mutate("annullato")}>Annulla ordine</Button>}
        {!ddtCollegati.data?.length && <Button variant="ghost" className="text-destructive" onClick={() => window.confirm("Eliminare l'ordine?") && elimina.mutate()}>Elimina</Button>}
      </div>
      {evadi && <DialogEvasione ordineId={id} cliente={cliente} righe={righeQ.data ?? []} onClose={() => setEvadi(false)} />}
    </Pagina>
  );
}

type RigaEv = { id: string | null; codice: string | null; descrizione: string | null; um: string | null; residuo: number | null; qta_in_bozza: number | null };

function DialogEvasione({ ordineId, cliente, righe, onClose }: { ordineId: string; cliente: boolean; righe: RigaEv[]; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const daEvadere = righe.filter((r) => Number(r.residuo) - Number(r.qta_in_bozza) > 0);
  const [qta, setQta] = useState<Record<string, number>>(Object.fromEntries(daEvadere.map((r) => [r.id!, Number(r.residuo) - Number(r.qta_in_bozza)])));
  const crea = useMutation({
    mutationFn: async () =>
      ok(await supabase.rpc("ddt_da_ordine", { _ordine: ordineId, _righe: Object.entries(qta).filter(([, q]) => q > 0).map(([riga_id, q]) => ({ riga_id, qta: q })) })),
    onSuccess: (ddt) => {
      qc.invalidateQueries({ queryKey: ["ordini"] });
      qc.invalidateQueries({ queryKey: ["ddt"] });
      navigate({ to: "/ddt/$id", params: { id: ddt } });
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{cliente ? "Quantità da spedire" : "Quantità ricevute"}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Si crea un DDT in bozza: puoi spedire anche solo una parte, il resto rimane da evadere.</p>
        <div className="max-h-[60vh] divide-y overflow-y-auto rounded-md border">
          {daEvadere.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">{r.descrizione}</p>
                <p className="text-xs text-muted-foreground">{r.codice} · residuo {formatNum(r.residuo)} {r.um}</p>
              </div>
              <CampoNumero valore={qta[r.id!] ?? 0} className="h-9 w-28" onChange={(n) => setQta({ ...qta, [r.id!]: Math.max(0, n ?? 0) })} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={() => crea.mutate()} disabled={crea.isPending || !Object.values(qta).some((q) => q > 0)}>Crea DDT</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
