import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Pagina } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Campo, CampoNumero } from "@/components/comuni/Campi";
import { usePagamenti, useMagazzini } from "@/components/comuni/Scelte";
import { ok, supabase } from "@/lib/dati";
import { messaggioErrore } from "@/lib/formato";
import { dimenticaSessione, ETICHETTE_PERMESSI, ETICHETTE_RUOLI, PERMESSI, type Ruolo } from "@/lib/session";
import { invitaUtente } from "@/lib/utenti.functions";
import type { Database } from "@/integrations/supabase/types";

type Azienda = Database["public"]["Tables"]["aziende"]["Row"];

export const Route = createFileRoute("/_authenticated/impostazioni")({
  head: () => ({ meta: [{ title: "Impostazioni — Trade" }] }),
  component: Impostazioni,
});

function Sezione({ titolo, children, nota }: { titolo: string; children: React.ReactNode; nota?: string }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-lg font-semibold">{titolo}</h2>
      {nota && <p className="mt-0.5 text-sm text-muted-foreground">{nota}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Impostazioni() {
  const { perms, me } = Route.useRouteContext();
  return (
    <Pagina titolo="Impostazioni">
      <div className="space-y-6">
        <MioProfilo nome={me.nome} cognome={me.cognome} />
        {perms.gestire_impostazioni && <DatiAzienda />}
        {perms.gestire_utenti && <Utenti mioId={me.id} sonoTitolare={me.ruolo === "titolare"} />}
        {perms.gestire_utenti && <Permessi />}
        {perms.gestire_impostazioni && <Pagamenti />}
        {perms.gestire_impostazioni && <Magazzini />}
        {perms.gestire_articoli && <Categorie />}
      </div>
    </Pagina>
  );
}

function MioProfilo({ nome, cognome }: { nome: string; cognome: string }) {
  const [n, setN] = useState(nome);
  const [c, setC] = useState(cognome);
  const salva = useMutation({
    mutationFn: async () => ok(await supabase.rpc("aggiorna_mio_nome", { _nome: n, _cognome: c })),
    onSuccess: () => { dimenticaSessione(); toast.success("Salvato: si vede alla prossima apertura"); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  return (
    <Sezione titolo="Il mio profilo">
      <div className="flex flex-wrap items-end gap-3">
        <Campo label="Nome"><Input value={n} onChange={(e) => setN(e.target.value)} /></Campo>
        <Campo label="Cognome"><Input value={c} onChange={(e) => setC(e.target.value)} /></Campo>
        <Button variant="outline" onClick={() => salva.mutate()}>Salva</Button>
      </div>
    </Sezione>
  );
}

function DatiAzienda() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["azienda"], queryFn: async () => ok(await supabase.from("aziende").select("*").single()) });
  const [a, setA] = useState<Azienda | null>(null);
  useEffect(() => { if (q.data) setA(q.data); }, [q.data]);
  const salva = useMutation({
    mutationFn: async () => {
      if (!a) return;
      const { id, creata_il: _c, ...dati } = a;
      ok(await supabase.from("aziende").update(dati).eq("id", id));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["azienda"] }); toast.success("Dati azienda salvati"); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  if (!a) return null;
  const t = (k: keyof Azienda) => (a[k] as string | null) ?? "";
  const set = (k: keyof Azienda, v: unknown) => setA({ ...a, [k]: v } as Azienda);
  return (
    <Sezione titolo="Azienda" nota="Compaiono nell'intestazione di DDT, ordini e offerte.">
      <div className="grid gap-3 sm:grid-cols-6">
        <Campo label="Ragione sociale" className="sm:col-span-4"><Input value={a.nome} onChange={(e) => set("nome", e.target.value)} /></Campo>
        <Campo label="Partita IVA" className="sm:col-span-2"><Input value={t("partita_iva")} onChange={(e) => set("partita_iva", e.target.value || null)} /></Campo>
        <Campo label="Indirizzo" className="sm:col-span-3"><Input value={t("indirizzo")} onChange={(e) => set("indirizzo", e.target.value || null)} /></Campo>
        <Campo label="CAP"><Input value={t("cap")} onChange={(e) => set("cap", e.target.value || null)} /></Campo>
        <Campo label="Comune"><Input value={t("comune")} onChange={(e) => set("comune", e.target.value || null)} /></Campo>
        <Campo label="Prov."><Input value={t("provincia")} maxLength={2} onChange={(e) => set("provincia", e.target.value.toUpperCase() || null)} /></Campo>
        <Campo label="Codice fiscale" className="sm:col-span-2"><Input value={t("codice_fiscale")} onChange={(e) => set("codice_fiscale", e.target.value || null)} /></Campo>
        <Campo label="Telefono" className="sm:col-span-2"><Input value={t("telefono")} onChange={(e) => set("telefono", e.target.value || null)} /></Campo>
        <Campo label="Email" className="sm:col-span-2"><Input value={t("email")} onChange={(e) => set("email", e.target.value || null)} /></Campo>
        <Campo label="PEC" className="sm:col-span-2"><Input value={t("pec")} onChange={(e) => set("pec", e.target.value || null)} /></Campo>
        <Campo label="IVA predefinita %"><CampoNumero valore={a.iva_predefinita} decimali={2} onChange={(n) => set("iva_predefinita", n ?? 22)} /></Campo>
        <Campo label="Avviso scadenze lotti (giorni)"><CampoNumero valore={a.giorni_avviso_scadenze} decimali={0} onChange={(n) => set("giorni_avviso_scadenze", Math.round(n ?? 30))} /></Campo>
        <label className="flex items-center gap-2 text-sm sm:col-span-6">
          <Switch checked={a.giacenza_negativa} onCheckedChange={(v) => set("giacenza_negativa", v)} />
          Permetti di scaricare più merce di quella in giacenza (sconsigliato con i lotti)
        </label>
        <Campo label="Note fisse in fondo ai DDT" className="sm:col-span-6"><Textarea rows={2} value={t("note_ddt")} onChange={(e) => set("note_ddt", e.target.value || null)} /></Campo>
      </div>
      <Button className="mt-4" onClick={() => salva.mutate()}>Salva dati azienda</Button>
    </Sezione>
  );
}

function Utenti({ mioId, sonoTitolare }: { mioId: string; sonoTitolare: boolean }) {
  const qc = useQueryClient();
  const invita = useServerFn(invitaUtente);
  const lista = useQuery({ queryKey: ["profili"], queryFn: async () => ok(await supabase.from("profili").select("*").order("nome")) });
  const [n, setN] = useState({ nome: "", cognome: "", email: "", ruolo: "ufficio" as Ruolo });
  const modifica = useMutation({
    mutationFn: async (p: { id: string; ruolo?: Ruolo; attivo?: boolean }) => {
      const { id, ...dati } = p;
      ok(await supabase.from("profili").update(dati).eq("id", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profili"] }),
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const invio = useMutation({
    mutationFn: async () => invita({ data: { ...n, redirectTo: `${window.location.origin}/imposta-password` } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profili"] });
      toast.success(`Invito inviato a ${n.email}`);
      setN({ nome: "", cognome: "", email: "", ruolo: "ufficio" });
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const ruoli = (Object.keys(ETICHETTE_RUOLI) as Ruolo[]).filter((r) => sonoTitolare || r !== "titolare");
  return (
    <Sezione titolo="Utenti" nota="Ogni collega riceve un'email per scegliere la password.">
      <div className="divide-y rounded-md border">
        {(lista.data ?? []).map((p) => (
          <div key={p.id} className={`flex flex-wrap items-center gap-3 px-3 py-2 text-sm ${p.attivo ? "" : "opacity-50"}`}>
            <div className="min-w-48 flex-1">
              <p className="font-medium">{`${p.nome} ${p.cognome}`.trim() || "(senza nome)"}</p>
              <p className="text-xs text-muted-foreground">{p.email}</p>
            </div>
            <Select value={p.ruolo} disabled={p.id === mioId || (p.ruolo === "titolare" && !sonoTitolare)} onValueChange={(v) => modifica.mutate({ id: p.id, ruolo: v as Ruolo })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(ETICHETTE_RUOLI) as Ruolo[]).map((r) => <SelectItem key={r} value={r} disabled={!ruoli.includes(r)}>{ETICHETTE_RUOLI[r]}</SelectItem>)}</SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs"><Switch checked={p.attivo} disabled={p.id === mioId} onCheckedChange={(v) => modifica.mutate({ id: p.id, attivo: v })} /> Attivo</label>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-12">
        <Input className="sm:col-span-2" placeholder="Nome" value={n.nome} onChange={(e) => setN({ ...n, nome: e.target.value })} />
        <Input className="sm:col-span-3" placeholder="Cognome" value={n.cognome} onChange={(e) => setN({ ...n, cognome: e.target.value })} />
        <Input className="sm:col-span-3" type="email" placeholder="Email" value={n.email} onChange={(e) => setN({ ...n, email: e.target.value })} />
        <Select value={n.ruolo} onValueChange={(v) => setN({ ...n, ruolo: v as Ruolo })}>
          <SelectTrigger className="sm:col-span-2"><SelectValue /></SelectTrigger>
          <SelectContent>{ruoli.map((r) => <SelectItem key={r} value={r}>{ETICHETTE_RUOLI[r]}</SelectItem>)}</SelectContent>
        </Select>
        <Button className="sm:col-span-2" onClick={() => invio.mutate()} disabled={invio.isPending || !n.nome || !n.email}>Invita</Button>
      </div>
    </Sezione>
  );
}

function Permessi() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["permessi_ruolo"], queryFn: async () => ok(await supabase.from("permessi_ruolo").select("ruolo, permesso")) });
  const ruoli: Ruolo[] = ["ufficio", "magazzino", "agente"];
  const ha = (r: Ruolo, p: string) => (q.data ?? []).some((x) => x.ruolo === r && x.permesso === p);
  const cambia = useMutation({
    mutationFn: async (x: { ruolo: Ruolo; permesso: string; on: boolean }) => {
      if (x.on) ok(await supabase.from("permessi_ruolo").insert({ ruolo: x.ruolo, permesso: x.permesso }));
      else ok(await supabase.from("permessi_ruolo").delete().eq("ruolo", x.ruolo).eq("permesso", x.permesso));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["permessi_ruolo"] }); dimenticaSessione(); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  return (
    <Sezione titolo="Permessi per ruolo" nota="Il titolare ha sempre tutti i permessi. Le modifiche valgono dal prossimo accesso.">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-muted-foreground [&>th]:px-2 [&>th]:py-1 [&>th]:text-left"><th>Permesso</th>{ruoli.map((r) => <th key={r} className="!text-center">{ETICHETTE_RUOLI[r]}</th>)}</tr></thead>
          <tbody>
            {PERMESSI.map((p) => (
              <tr key={p} className="border-t [&>td]:px-2 [&>td]:py-1.5">
                <td>{ETICHETTE_PERMESSI[p]}</td>
                {ruoli.map((r) => (
                  <td key={r} className="text-center"><Checkbox checked={ha(r, p)} onCheckedChange={(v) => cambia.mutate({ ruolo: r, permesso: p, on: !!v })} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Sezione>
  );
}

function Pagamenti() {
  const qc = useQueryClient();
  const lista = usePagamenti();
  const [nome, setNome] = useState("");
  const [rate, setRate] = useState("30");
  const [fm, setFm] = useState(true);
  const leggiRate = (s: string) => {
    const g = s.split(/[/,;\s]+/).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x >= 0);
    if (!g.length) return null;
    const p = Math.floor((100 / g.length) * 100) / 100;
    return g.map((giorni, i) => ({ giorni, perc: i === g.length - 1 ? Math.round((100 - p * (g.length - 1)) * 100) / 100 : p }));
  };
  const crea = useMutation({
    mutationFn: async () => {
      const r = leggiRate(rate);
      if (!nome.trim() || !r) throw new Error("Indica nome e giorni delle rate (es. 30/60/90)");
      ok(await supabase.from("pagamenti").insert({ nome: nome.trim(), rate: r, fine_mese: fm }));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pagamenti"] }); setNome(""); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const attiva = useMutation({
    mutationFn: async (x: { id: string; attivo: boolean }) => ok(await supabase.from("pagamenti").update({ attivo: x.attivo }).eq("id", x.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagamenti"] }),
  });
  return (
    <Sezione titolo="Condizioni di pagamento" nota="Le rate partono dalla fine del mese del DDT (fattura differita). Usa lo stesso nome che hai in Danea.">
      <div className="divide-y rounded-md border">
        {(lista.data ?? []).map((p) => (
          <div key={p.id} className={`flex items-center gap-3 px-3 py-2 text-sm ${p.attivo ? "" : "opacity-50"}`}>
            <span className="flex-1 font-medium">{p.nome}</span>
            <span className="text-xs text-muted-foreground">
              {(p.rate as { giorni: number; perc: number }[]).map((r) => `${r.giorni} gg ${r.perc}%`).join(" · ")}{p.fine_mese ? " · fine mese" : ""}
            </span>
            <Switch checked={p.attivo} onCheckedChange={(v) => attiva.mutate({ id: p.id, attivo: v })} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Campo label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Bonifico 30/60 gg d.f.f.m." /></Campo>
        <Campo label="Giorni delle rate"><Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="30/60" className="w-32" /></Campo>
        <label className="flex items-center gap-2 pb-2 text-sm"><Switch checked={fm} onCheckedChange={setFm} /> Fine mese</label>
        <Button variant="outline" onClick={() => crea.mutate()}><Plus className="mr-1 h-4 w-4" /> Aggiungi</Button>
      </div>
    </Sezione>
  );
}

function Magazzini() {
  const qc = useQueryClient();
  const lista = useMagazzini();
  const [nome, setNome] = useState("");
  const crea = useMutation({
    mutationFn: async () => ok(await supabase.from("magazzini").insert({ nome: nome.trim() })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["magazzini"] }); setNome(""); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const rinomina = useMutation({
    mutationFn: async (x: { id: string; nome: string }) => ok(await supabase.from("magazzini").update({ nome: x.nome }).eq("id", x.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["magazzini"] }),
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  return (
    <Sezione titolo="Magazzini">
      <div className="space-y-2">
        {(lista.data ?? []).map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            <Input defaultValue={m.nome} onBlur={(e) => e.target.value.trim() && e.target.value !== m.nome && rinomina.mutate({ id: m.id, nome: e.target.value.trim() })} className="max-w-sm" />
            {m.predefinito && <span className="text-xs text-muted-foreground">predefinito</span>}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nuovo magazzino" className="max-w-sm" />
        <Button variant="outline" disabled={!nome.trim()} onClick={() => crea.mutate()}><Plus className="h-4 w-4" /></Button>
      </div>
    </Sezione>
  );
}

function Categorie() {
  const qc = useQueryClient();
  const lista = useQuery({ queryKey: ["categorie"], queryFn: async () => ok(await supabase.from("categorie").select("id, nome, parent_id, ricarico").order("nome")) });
  const [nome, setNome] = useState("");
  const [padre, setPadre] = useState("_");
  const crea = useMutation({
    mutationFn: async () => ok(await supabase.from("categorie").insert({ nome: nome.trim(), parent_id: padre === "_" ? null : padre })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categorie"] }); setNome(""); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const ricarico = useMutation({
    mutationFn: async (x: { id: string; ricarico: number | null }) => ok(await supabase.from("categorie").update({ ricarico: x.ricarico }).eq("id", x.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorie"] }),
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const togli = useMutation({
    mutationFn: async (id: string) => ok(await supabase.from("categorie").delete().eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorie"] }),
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const radici = (lista.data ?? []).filter((c) => !c.parent_id);
  const riga = (c: NonNullable<typeof lista.data>[number], sotto: boolean) => (
    <div key={c.id} className={`flex items-center gap-2 py-1 text-sm ${sotto ? "pl-6" : "font-medium"}`}>
      <span className="flex-1">{c.nome}</span>
      <span className="text-xs text-muted-foreground">ricarico %</span>
      <CampoNumero valore={c.ricarico} vuotoNull decimali={2} className="h-8 w-20" onChange={(n) => ricarico.mutate({ id: c.id, ricarico: n })} />
      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => togli.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>
  );
  return (
    <Sezione titolo="Categorie articoli" nota="Il ricarico della categoria vale per gli articoli che non sono in nessun listino e non hanno un ricarico proprio.">
      {radici.map((c) => (
        <div key={c.id}>
          {riga(c, false)}
          {(lista.data ?? []).filter((s) => s.parent_id === c.id).map((s) => riga(s, true))}
        </div>
      ))}
      <div className="mt-3 flex flex-wrap gap-2">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nuova categoria" className="max-w-xs" />
        <Select value={padre} onValueChange={setPadre}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Categoria principale</SelectItem>
            {radici.map((c) => <SelectItem key={c.id} value={c.id}>Sotto {c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" disabled={!nome.trim()} onClick={() => crea.mutate()}><Plus className="h-4 w-4" /></Button>
      </div>
    </Sezione>
  );
}
