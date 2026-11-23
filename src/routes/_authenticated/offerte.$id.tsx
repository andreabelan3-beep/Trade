import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { Pagina } from "@/components/app/AppShell";
import { Percorso } from "@/components/app/Percorso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Campo } from "@/components/comuni/Campi";
import { SceltaSoggetto, usePagamenti } from "@/components/comuni/Scelte";
import { Stato } from "@/components/comuni/Stato";
import { EditorRighe, salvaRighe, type RigaDoc } from "@/components/documenti/EditorRighe";
import { ok, supabase } from "@/lib/dati";
import { formatData, messaggioErrore } from "@/lib/formato";
import { apriPdf, creaPdfDocumento } from "@/lib/documento-pdf";
import { indirizzoSoggetto, intestazioneAzienda } from "@/lib/azienda";
import type { Database } from "@/integrations/supabase/types";

type Offerta = Database["public"]["Tables"]["offerte"]["Row"];

export const Route = createFileRoute("/_authenticated/offerte/$id")({
  head: () => ({ meta: [{ title: "Offerta — Trade" }] }),
  component: EditorOfferta,
});

function EditorOfferta() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const offerta = useQuery({ queryKey: ["offerte", id], queryFn: async () => ok(await supabase.from("offerte").select("*").eq("id", id).single()) });
  const righeQ = useQuery({ queryKey: ["offerte", id, "righe"], queryFn: async () => ok(await supabase.from("offerte_righe").select("*").eq("offerta_id", id).order("posizione")) });
  const pagamenti = usePagamenti();
  const [o, setO] = useState<Offerta | null>(null);
  const [righe, setRighe] = useState<RigaDoc[]>([]);
  const [modificato, setModificato] = useState(false);
  useEffect(() => { if (offerta.data) { setO(offerta.data); setModificato(false); } }, [offerta.data]);
  useEffect(() => {
    if (righeQ.data) setRighe(righeQ.data.map((r) => ({ ...r, qta: Number(r.qta), prezzo: Number(r.prezzo), sconto: Number(r.sconto), iva: Number(r.iva) })));
  }, [righeQ.data]);
  const ricarica = () => qc.invalidateQueries({ queryKey: ["offerte"] });

  async function salvaTutto(stato?: string) {
    if (!o) return;
    ok(await supabase.from("offerte").update({
      soggetto_id: o.soggetto_id, data: o.data, valida_fino: o.valida_fino, oggetto: o.oggetto, pagamento_id: o.pagamento_id,
      note: o.note, note_interne: o.note_interne, ...(stato ? { stato } : {}),
    }).eq("id", id));
    await salvaRighe("offerte_righe", "offerta_id", id, righe, (righeQ.data ?? []).map((r) => r.id));
  }
  const salva = useMutation({
    mutationFn: (stato?: string) => salvaTutto(stato),
    onSuccess: () => { ricarica(); toast.success("Offerta salvata"); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const accetta = useMutation({
    mutationFn: async () => {
      if (modificato) await salvaTutto();
      return ok(await supabase.rpc("accetta_offerta", { _id: id }));
    },
    onSuccess: (ordine) => {
      ricarica();
      qc.invalidateQueries({ queryKey: ["ordini"] });
      toast.success("Ordine cliente creato dall'offerta");
      navigate({ to: "/ordini/$id", params: { id: ordine } });
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const elimina = useMutation({
    mutationFn: async () => ok(await supabase.from("offerte").delete().eq("id", id)),
    onSuccess: () => { ricarica(); navigate({ to: "/offerte" }); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const stampa = useMutation({
    mutationFn: async () => {
      if (!o) return;
      if (modificato) await salvaTutto();
      const [az, sog] = await Promise.all([intestazioneAzienda(), supabase.from("soggetti").select("*").eq("id", o.soggetto_id).single()]);
      const bytes = await creaPdfDocumento({
        titolo: "OFFERTA",
        sottotitolo: `N. ${o.numero} del ${formatData(o.data)}`,
        azienda: az,
        destinatario: { etichetta: "Spett.le", righe: sog.data ? indirizzoSoggetto(sog.data) : [] },
        info: [
          ["Oggetto", o.oggetto ?? ""],
          ["Validità", o.valida_fino ? `fino al ${formatData(o.valida_fino)}` : ""],
          ["Pagamento", pagamenti.data?.find((p) => p.id === (o.pagamento_id ?? sog.data?.pagamento_id))?.nome ?? ""],
        ],
        righe,
        conPrezzi: true,
        note: o.note,
        firme: ["Per accettazione (timbro e firma)"],
      });
      apriPdf(bytes, `Offerta-${o.numero?.replace("/", "-")}.pdf`);
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });

  if (!o) return <Pagina titolo="Offerta">Caricamento…</Pagina>;
  const bloccata = o.stato === "accettata";
  const set = <K extends keyof Offerta>(k: K, v: Offerta[K]) => { setO({ ...o, [k]: v }); setModificato(true); };
  return (
    <Pagina titolo={`Offerta ${o.numero}`} largo
      percorso={<Percorso><Link to="/offerte">Offerte</Link><span>{o.numero}</span></Percorso>}
      azioni={
        <>
          <Stato stato={o.stato} className="self-center" />
          <Button variant="outline" onClick={() => stampa.mutate()}><Printer className="mr-1 h-4 w-4" /> Stampa</Button>
          {!bloccata && <Button variant="outline" onClick={() => salva.mutate(undefined)}>Salva</Button>}
          {o.stato === "bozza" && <Button variant="outline" onClick={() => salva.mutate("inviata")}>Segna inviata</Button>}
          {!bloccata && <Button onClick={() => accetta.mutate()} disabled={accetta.isPending || !righe.length}>Accettata: crea ordine</Button>}
          {bloccata && o.ordine_id && <Button asChild><Link to="/ordini/$id" params={{ id: o.ordine_id }}>Vai all'ordine</Link></Button>}
        </>
      }>
      {modificato && <Alert className="mb-4"><AlertDescription>Modifiche non salvate.</AlertDescription></Alert>}
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-6">
        <Campo label="Cliente" className="sm:col-span-3">
          <SceltaSoggetto ruolo="cliente" valore={o.soggetto_id} disabled={bloccata} onChange={(v) => v && set("soggetto_id", v)} />
        </Campo>
        <Campo label="Data"><Input type="date" value={o.data} disabled={bloccata} onChange={(e) => set("data", e.target.value)} /></Campo>
        <Campo label="Valida fino al"><Input type="date" value={o.valida_fino ?? ""} disabled={bloccata} onChange={(e) => set("valida_fino", e.target.value || null)} /></Campo>
        <Campo label="Pagamento">
          <Select value={o.pagamento_id ?? "_"} disabled={bloccata} onValueChange={(v) => set("pagamento_id", v === "_" ? null : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_">Da anagrafica</SelectItem>
              {(pagamenti.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="Oggetto" className="sm:col-span-6"><Input value={o.oggetto ?? ""} disabled={bloccata} onChange={(e) => set("oggetto", e.target.value || null)} /></Campo>
        <Campo label="Note (stampate)" className="sm:col-span-3"><Textarea rows={3} value={o.note ?? ""} disabled={bloccata} onChange={(e) => set("note", e.target.value || null)} /></Campo>
        <Campo label="Note interne" className="sm:col-span-3"><Textarea rows={3} value={o.note_interne ?? ""} disabled={bloccata} onChange={(e) => set("note_interne", e.target.value || null)} /></Campo>
      </div>
      <h2 className="mb-2 mt-6 text-lg font-semibold">Righe</h2>
      <EditorRighe righe={righe} onChange={(r) => { setRighe(r); setModificato(true); }} bloccato={bloccata} tipoPrezzo="vendita" soggetto={o.soggetto_id} />
      {!bloccata && (
        <div className="mt-8 flex gap-2">
          {o.stato !== "rifiutata" && <Button variant="outline" onClick={() => salva.mutate("rifiutata")}>Segna rifiutata</Button>}
          {o.stato === "rifiutata" && <Button variant="outline" onClick={() => salva.mutate("bozza")}>Riporta in bozza</Button>}
          <Button variant="ghost" className="text-destructive" onClick={() => window.confirm("Eliminare l'offerta?") && elimina.mutate()}>Elimina</Button>
        </div>
      )}
    </Pagina>
  );
}
