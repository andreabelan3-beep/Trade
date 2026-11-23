import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileUp, Printer, Sparkles } from "lucide-react";
import { Pagina } from "@/components/app/AppShell";
import { Percorso } from "@/components/app/Percorso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Campo, CampoNumero } from "@/components/comuni/Campi";
import { SceltaSoggetto, useMagazzini, usePagamenti } from "@/components/comuni/Scelte";
import { Stato } from "@/components/comuni/Stato";
import { EditorRighe, salvaRighe, type RigaDoc } from "@/components/documenti/EditorRighe";
import { ok, supabase } from "@/lib/dati";
import { formatData, formatNum, messaggioErrore } from "@/lib/formato";
import { apriPdf, creaPdfDocumento } from "@/lib/documento-pdf";
import { indirizzoSoggetto, intestazioneAzienda } from "@/lib/azienda";
import { leggiDdt } from "@/lib/bolle.functions";
import { CAUSALI_DDT } from "./ddt.index";
import type { Database } from "@/integrations/supabase/types";

type Ddt = Database["public"]["Tables"]["ddt"]["Row"];

export const Route = createFileRoute("/_authenticated/ddt/$id")({
  head: () => ({ meta: [{ title: "DDT — Trade" }] }),
  component: EditorDdt,
});

const CAMPI_RIGA: (keyof RigaDoc)[] = ["lotto", "scadenza", "ordine_riga_id"];

function EditorDdt() {
  const { id } = Route.useParams();
  const { perms, me } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const leggi = useServerFn(leggiDdt);
  const fileRef = useRef<HTMLInputElement>(null);

  const ddt = useQuery({ queryKey: ["ddt", id], queryFn: async () => ok(await supabase.from("ddt").select("*").eq("id", id).single()) });
  const righeQ = useQuery({
    queryKey: ["ddt", id, "righe"],
    queryFn: async () => ok(await supabase.from("ddt_righe").select("*").eq("ddt_id", id).order("posizione")),
  });
  const lottiQ = useQuery({
    queryKey: ["ddt", id, "lotti"],
    enabled: !!ddt.data && ddt.data.stato !== "bozza",
    queryFn: async () => ok(await supabase.from("ddt_righe_lotti").select("*").in("ddt_riga_id", (righeQ.data ?? []).map((r) => r.id))),
  });
  const destinazioni = useQuery({
    queryKey: ["destinazioni", ddt.data?.soggetto_id],
    enabled: !!ddt.data?.soggetto_id,
    queryFn: async () => ok(await supabase.from("destinazioni").select("*").eq("soggetto_id", ddt.data!.soggetto_id!).order("nome")),
  });
  const magazzini = useMagazzini();
  const pagamenti = usePagamenti();

  const [d, setD] = useState<Ddt | null>(null);
  const [righe, setRighe] = useState<RigaDoc[]>([]);
  const [modificato, setModificato] = useState(false);
  useEffect(() => { if (ddt.data) { setD(ddt.data); setModificato(false); } }, [ddt.data]);
  useEffect(() => {
    if (righeQ.data) setRighe(righeQ.data.map((r) => ({ ...r, qta: Number(r.qta), prezzo: Number(r.prezzo), sconto: Number(r.sconto), iva: Number(r.iva) })));
  }, [righeQ.data]);

  const ricarica = () => {
    qc.invalidateQueries({ queryKey: ["ddt"] });
    qc.invalidateQueries({ queryKey: ["ordini"] });
    qc.invalidateQueries({ queryKey: ["magazzino"] });
    qc.invalidateQueries({ queryKey: ["cruscotto"] });
  };

  async function salvaTutto() {
    if (!d) return;
    ok(await supabase.from("ddt").update({
      causale: d.causale, data: d.data, numero: d.direzione === "entrata" ? (d.numero?.trim() || null) : d.numero,
      soggetto_id: d.soggetto_id, destinazione_id: d.destinazione_id, magazzino_id: d.magazzino_id, pagamento_id: d.pagamento_id,
      trasporto_cura: d.trasporto_cura, vettore: d.vettore, aspetto_beni: d.aspetto_beni, colli: d.colli, peso: d.peso, porto: d.porto,
      inizio_trasporto: d.inizio_trasporto, note: d.note, note_interne: d.note_interne,
    }).eq("id", id));
    await salvaRighe("ddt_righe", "ddt_id", id, righe, (righeQ.data ?? []).map((r) => r.id), CAMPI_RIGA);
  }
  const salva = useMutation({
    mutationFn: salvaTutto,
    onSuccess: () => { ricarica(); toast.success("Bozza salvata"); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const conferma = useMutation({
    mutationFn: async () => {
      await salvaTutto();
      return ok(await supabase.rpc("conferma_ddt", { _id: id }));
    },
    onSuccess: (n) => { ricarica(); toast.success(d?.direzione === "uscita" ? `DDT n. ${n} confermato: magazzino scaricato` : "DDT confermato: merce caricata"); },
    onError: (e) => { ricarica(); toast.error(messaggioErrore(e)); },
  });
  const azione = useMutation({
    mutationFn: async (a: "riapri" | "annulla" | "elimina" | "da_fatturare") => {
      if (a === "riapri") ok(await supabase.rpc("riapri_ddt", { _id: id }));
      if (a === "annulla") ok(await supabase.rpc("annulla_ddt", { _id: id }));
      if (a === "da_fatturare") ok(await supabase.rpc("riporta_da_fatturare", { _id: id }));
      if (a === "elimina") ok(await supabase.from("ddt").delete().eq("id", id));
      return a;
    },
    onSuccess: (a) => {
      ricarica();
      if (a === "elimina") navigate({ to: "/ddt", search: { direzione: (d?.direzione ?? "uscita") as "uscita" | "entrata" } });
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });

  const carica = useMutation({
    mutationFn: async (file: File) => {
      if (modificato) await salvaTutto();
      const nome = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
      const path = `${me.aziendaId}/${id}/${Date.now()}-${nome}`;
      const up = await supabase.storage.from("bolle").upload(path, file, { contentType: file.type || undefined });
      if (up.error) throw up.error;
      ok(await supabase.from("ddt").update({ file_path: path }).eq("id", id));
      return path;
    },
    onSuccess: () => { ricarica(); toast.success("File caricato"); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const leggiIA = useMutation({
    mutationFn: async () => {
      if (modificato) await salvaTutto();
      return leggi({ data: { id } });
    },
    onSuccess: (r) => {
      ricarica();
      toast.success(`Letto: ${r.righe} righe, ${r.abbinate} abbinate ad articoli${r.fornitoreTrovato ? "" : ` · fornitore "${r.fornitoreLetto ?? "?"}" non trovato: sceglilo`}`);
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  async function apriFile() {
    if (!d?.file_path) return;
    const r = await supabase.storage.from("bolle").createSignedUrl(d.file_path, 300);
    if (r.data) window.open(r.data.signedUrl, "_blank");
  }

  const stampa = useMutation({
    mutationFn: async (conPrezzi: boolean) => {
      if (!d) return;
      if (modificato) await salvaTutto();
      const [az, sog, dest, lotti] = await Promise.all([
        intestazioneAzienda(),
        d.soggetto_id ? supabase.from("soggetti").select("*").eq("id", d.soggetto_id).single() : Promise.resolve({ data: null }),
        d.destinazione_id ? supabase.from("destinazioni").select("*").eq("id", d.destinazione_id).single() : Promise.resolve({ data: null }),
        supabase.from("ddt_righe_lotti").select("*").in("ddt_riga_id", righe.map((r) => r.id)),
      ]);
      const ls = lotti.data ?? [];
      const bytes = await creaPdfDocumento({
        titolo: "DOCUMENTO DI TRASPORTO",
        sottotitolo: `${d.numero ? `N. ${d.numero}` : "BOZZA"} del ${formatData(d.data)}`,
        azienda: az,
        destinatario: { etichetta: d.direzione === "uscita" ? "Destinatario" : "Mittente", righe: sog.data ? indirizzoSoggetto(sog.data) : ["—"] },
        destinazione: dest.data ? { etichetta: "Luogo di destinazione", righe: [dest.data.nome, dest.data.indirizzo ?? "", [dest.data.cap, dest.data.comune, dest.data.provincia && `(${dest.data.provincia})`].filter(Boolean).join(" ")] } : null,
        info: [
          ["Causale del trasporto", CAUSALI_DDT[d.causale] ?? d.causale],
          ["Pagamento", pagamenti.data?.find((p) => p.id === (d.pagamento_id ?? sog.data?.pagamento_id))?.nome ?? ""],
          ["Trasporto a cura", d.trasporto_cura === "mittente" ? "Mittente" : d.trasporto_cura === "destinatario" ? "Destinatario" : "Vettore"],
          ["Porto", d.porto ?? ""],
        ],
        righe: righe.filter((r) => r.qta > 0 || r.descrizione).map((r) => {
          const lr = ls.filter((l) => l.ddt_riga_id === r.id && l.lotto);
          const dettagli = lr.length
            ? lr.map((l) => `Lotto ${l.lotto}${l.scadenza ? ` scad. ${formatData(l.scadenza)}` : ""}${lr.length > 1 ? `: ${formatNum(l.qta)}` : ""}`)
            : r.lotto ? [`Lotto ${r.lotto}${r.scadenza ? ` scad. ${formatData(r.scadenza)}` : ""}`] : [];
          return { ...r, dettagli };
        }),
        conPrezzi,
        note: [d.note, az.noteDdt].filter(Boolean).join("\n") || null,
        piede: [
          ["Aspetto dei beni", d.aspetto_beni ?? ""],
          ["N. colli", d.colli ? String(d.colli) : ""],
          ["Peso kg", d.peso ? formatNum(d.peso) : ""],
          ["Inizio trasporto", d.inizio_trasporto ? new Date(d.inizio_trasporto).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }) : ""],
          ["Vettore", d.vettore ?? ""],
        ],
        firme: ["Firma conducente", "Firma vettore", "Firma destinatario"],
      });
      apriPdf(bytes, `DDT-${(d.numero ?? "bozza").replace("/", "-")}.pdf`);
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });

  const lottiPerRiga = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of lottiQ.data ?? []) {
      if (!l.ddt_riga_id) continue;
      const t = l.lotto ? `${l.lotto}${l.scadenza ? ` (${formatData(l.scadenza)})` : ""}: ${formatNum(l.qta)}` : `senza lotto: ${formatNum(l.qta)}`;
      m.set(l.ddt_riga_id, [m.get(l.ddt_riga_id), t].filter(Boolean).join(" · "));
    }
    return m;
  }, [lottiQ.data]);

  if (!d) return <Pagina titolo="DDT">Caricamento…</Pagina>;
  const bozza = d.stato === "bozza";
  const uscita = d.direzione === "uscita";
  const ruolo = (uscita && d.causale !== "reso_fornitore") || d.causale === "reso_cliente" ? "cliente" : "fornitore";
  const set = <K extends keyof Ddt>(k: K, v: Ddt[K]) => { setD({ ...d, [k]: v }); setModificato(true); };
  const cambiaRighe = (r: RigaDoc[]) => { setRighe(r); setModificato(true); };
  const titolo = `${uscita ? "DDT" : "DDT fornitore"} ${d.numero ?? "(bozza)"}`;

  return (
    <Pagina titolo={titolo} largo
      percorso={<Percorso><Link to="/ddt" search={{ direzione: d.direzione as "uscita" | "entrata" }}>DDT {uscita ? "in uscita" : "in entrata"}</Link><span>{d.numero ?? "Bozza"}</span></Percorso>}
      azioni={
        <>
          <Stato stato={d.stato} className="self-center" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline"><Printer className="mr-1 h-4 w-4" /> Stampa</Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => stampa.mutate(false)}>DDT senza prezzi</DropdownMenuItem>
              <DropdownMenuItem onClick={() => stampa.mutate(true)}>DDT con prezzi</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {bozza && <Button variant="outline" onClick={() => salva.mutate()} disabled={salva.isPending}>Salva bozza</Button>}
          {bozza && <Button onClick={() => conferma.mutate()} disabled={conferma.isPending}>{conferma.isPending ? "Conferma…" : uscita ? "Conferma e scarica" : "Conferma e carica"}</Button>}
          {d.stato === "confermato" && <Button variant="outline" onClick={() => window.confirm("Riaprire il DDT? Il magazzino torna come prima della conferma.") && azione.mutate("riapri")}>Riapri</Button>}
          {d.stato === "fatturato" && <Button variant="outline" onClick={() => azione.mutate("da_fatturare")}>Riporta da fatturare</Button>}
        </>
      }>
      {modificato && bozza && <Alert className="mb-4"><AlertDescription>Modifiche non salvate.</AlertDescription></Alert>}
      {d.stato === "fatturato" && <Alert className="mb-4"><AlertDescription>Esportato verso Danea il {formatData(d.danea_esportato_il)}: per modificarlo riportalo "da fatturare".</AlertDescription></Alert>}

      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-6">
        <Campo label="Causale" className="sm:col-span-2">
          <Select value={d.causale} disabled={!bozza} onValueChange={(v) => set("causale", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(uscita ? ["vendita", "reso_fornitore", "conto_visione", "omaggio"] : ["acquisto", "reso_cliente"]).map((c) => (
                <SelectItem key={c} value={c}>{CAUSALI_DDT[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo label={ruolo === "cliente" ? "Cliente" : "Fornitore"} className="sm:col-span-4">
          <SceltaSoggetto ruolo={ruolo} valore={d.soggetto_id} disabled={!bozza}
            onChange={(v) => { setD({ ...d, soggetto_id: v, destinazione_id: null }); setModificato(true); }} />
        </Campo>
        <Campo label="Data"><Input type="date" value={d.data} disabled={!bozza} onChange={(e) => set("data", e.target.value)} /></Campo>
        <Campo label={uscita ? "Numero" : "Numero DDT fornitore"}>
          <Input value={d.numero ?? ""} disabled={!bozza || uscita} placeholder={uscita ? "alla conferma" : ""} onChange={(e) => set("numero", e.target.value)} />
        </Campo>
        <Campo label="Magazzino" className="sm:col-span-2">
          <Select value={d.magazzino_id ?? ""} disabled={!bozza} onValueChange={(v) => set("magazzino_id", v)}>
            <SelectTrigger><SelectValue placeholder="Predefinito" /></SelectTrigger>
            <SelectContent>{(magazzini.data ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
          </Select>
        </Campo>
        <Campo label="Pagamento (se diverso dall'anagrafica)" className="sm:col-span-2">
          <Select value={d.pagamento_id ?? "_"} disabled={d.stato === "fatturato"} onValueChange={(v) => set("pagamento_id", v === "_" ? null : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_">Da anagrafica</SelectItem>
              {(pagamenti.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </Campo>
        {uscita && (
          <>
            <Campo label="Destinazione" className="sm:col-span-2">
              <Select value={d.destinazione_id ?? "_"} disabled={!bozza} onValueChange={(v) => set("destinazione_id", v === "_" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">Sede del cliente</SelectItem>
                  {(destinazioni.data ?? []).map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Trasporto a cura">
              <Select value={d.trasporto_cura} onValueChange={(v) => set("trasporto_cura", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mittente">Mittente</SelectItem>
                  <SelectItem value="destinatario">Destinatario</SelectItem>
                  <SelectItem value="vettore">Vettore</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Vettore"><Input value={d.vettore ?? ""} onChange={(e) => set("vettore", e.target.value || null)} /></Campo>
            <Campo label="Aspetto dei beni"><Input value={d.aspetto_beni ?? ""} onChange={(e) => set("aspetto_beni", e.target.value || null)} /></Campo>
            <Campo label="Porto"><Input value={d.porto ?? ""} onChange={(e) => set("porto", e.target.value || null)} /></Campo>
            <Campo label="Colli"><CampoNumero valore={d.colli} vuotoNull decimali={0} onChange={(n) => set("colli", n === null ? null : Math.round(n))} /></Campo>
            <Campo label="Peso kg"><CampoNumero valore={d.peso} vuotoNull decimali={2} onChange={(n) => set("peso", n)} /></Campo>
            <Campo label="Inizio trasporto" className="sm:col-span-2">
              <Input type="datetime-local" value={d.inizio_trasporto ? toLocal(d.inizio_trasporto) : ""}
                onChange={(e) => set("inizio_trasporto", e.target.value ? new Date(e.target.value).toISOString() : null)} />
            </Campo>
          </>
        )}
        <Campo label="Note (stampate)" className="sm:col-span-3"><Textarea rows={2} value={d.note ?? ""} onChange={(e) => set("note", e.target.value || null)} /></Campo>
        <Campo label="Note interne" className="sm:col-span-3"><Textarea rows={2} value={d.note_interne ?? ""} onChange={(e) => set("note_interne", e.target.value || null)} /></Campo>
        {!bozza && modificato && (
          <div className="sm:col-span-6">
            <Button size="sm" variant="outline" onClick={() => salva.mutate()}>Salva dati del trasporto e note</Button>
          </div>
        )}
      </div>

      {!uscita && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed bg-card p-3">
          <input ref={fileRef} type="file" accept="application/pdf,image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) carica.mutate(f); e.target.value = ""; }} />
          {bozza && (
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={carica.isPending}>
              <FileUp className="mr-1 h-4 w-4" /> {d.file_path ? "Sostituisci foto/PDF" : "Carica foto o PDF del DDT"}
            </Button>
          )}
          {d.file_path && <Button variant="link" onClick={() => void apriFile()}>Apri il DDT del fornitore</Button>}
          {bozza && d.file_path && (
            <Button onClick={() => (righe.length === 0 || window.confirm("La lettura sostituisce le righe attuali. Continuare?")) && leggiIA.mutate()} disabled={leggiIA.isPending}>
              <Sparkles className="mr-1 h-4 w-4" /> {leggiIA.isPending ? "Lettura in corso (fino a un minuto)…" : "Leggi con l'IA"}
            </Button>
          )}
          <p className="w-full text-xs text-muted-foreground">
            La lettura compila fornitore, numero, data e righe (anche lotti e scadenze) e abbina gli articoli dal codice fornitore, dal codice o dall'EAN. Controlla sempre prima di confermare.
          </p>
        </div>
      )}

      <h2 className="mb-2 mt-6 text-lg font-semibold">Righe</h2>
      {uscita && bozza && <p className="mb-2 text-xs text-muted-foreground">Lotto vuoto = scelto in automatico alla conferma, prima quello che scade prima.</p>}
      <EditorRighe
        righe={righe}
        onChange={cambiaRighe}
        bloccato={!bozza}
        tipoPrezzo={uscita && d.causale !== "reso_fornitore" ? "vendita" : "acquisto"}
        soggetto={d.soggetto_id}
        lotti
        extra={!bozza ? { titolo: "Lotti movimentati", cella: (r) => <span className="text-xs text-muted-foreground">{lottiPerRiga.get(r.id) ?? ""}</span> } : undefined}
      />

      <div className="mt-8 flex flex-wrap gap-2">
        {bozza && d.numero_int === null && (
          <Button variant="ghost" className="text-destructive" onClick={() => window.confirm("Eliminare la bozza?") && azione.mutate("elimina")}>Elimina bozza</Button>
        )}
        {(d.stato === "confermato" || (bozza && d.numero_int !== null)) && (
          <Button variant="ghost" className="text-destructive" onClick={() => window.confirm("Annullare il DDT? Il numero resta usato.") && azione.mutate("annulla")}>Annulla DDT</Button>
        )}
      </div>
    </Pagina>
  );
}

function toLocal(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
