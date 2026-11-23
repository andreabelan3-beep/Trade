import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";
import { Pagina } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Campo, CampoNumero } from "@/components/comuni/Campi";
import { useListini, usePagamenti } from "@/components/comuni/Scelte";
import { Vuoto } from "@/components/comuni/Stato";
import { filtroTesto, ok, supabase } from "@/lib/dati";
import { messaggioErrore } from "@/lib/formato";
import type { Database } from "@/integrations/supabase/types";

type Soggetto = Database["public"]["Tables"]["soggetti"]["Row"];
type Search = { tipo?: "clienti" | "fornitori" | "tutti" };

export const Route = createFileRoute("/_authenticated/anagrafiche")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tipo: s["tipo"] === "fornitori" || s["tipo"] === "tutti" ? s["tipo"] : "clienti",
  }),
  head: () => ({ meta: [{ title: "Clienti e fornitori — Trade" }] }),
  component: Anagrafiche,
});

function Anagrafiche() {
  const { tipo = "clienti" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { perms } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const [aperto, setAperto] = useState<Soggetto | "nuovo" | null>(null);
  const lista = useQuery({
    queryKey: ["soggetti", "elenco", tipo, q],
    queryFn: async () => {
      let r = supabase.from("soggetti").select("*, pagamenti(nome), listini!soggetti_listino_fk(nome)");
      if (tipo === "clienti") r = r.eq("cliente", true);
      if (tipo === "fornitori") r = r.eq("fornitore", true);
      const f = filtroTesto(q, ["ragione_sociale", "codice", "partita_iva", "comune", "email"]);
      if (f) r = r.or(f);
      return ok(await r.order("attivo", { ascending: false }).order("ragione_sociale").limit(300));
    },
  });
  const puoCreare = perms.gestire_anagrafiche || perms.gestire_vendite;

  return (
    <Pagina titolo="Clienti e fornitori"
      azioni={puoCreare && <Button onClick={() => setAperto("nuovo")}><Plus className="mr-1 h-4 w-4" /> Nuovo</Button>}>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tipo} onValueChange={(v) => navigate({ search: { tipo: v as "clienti" | "fornitori" | "tutti" } })}>
          <TabsList>
            <TabsTrigger value="clienti">Clienti</TabsTrigger>
            <TabsTrigger value="fornitori">Fornitori</TabsTrigger>
            <TabsTrigger value="tutti">Tutti</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nome, codice, P.IVA, comune…" className="pl-9" />
        </div>
      </div>
      <div className="mt-4">
        {lista.data?.length === 0 && <Vuoto>Nessun risultato.</Vuoto>}
        {!!lista.data?.length && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  <th>Ragione sociale</th><th>Codice</th><th>P.IVA</th><th>Comune</th><th>Pagamento</th><th>Listino</th>
                </tr>
              </thead>
              <tbody>
                {lista.data.map((s) => (
                  <tr key={s.id} onClick={() => setAperto(s)} className={`cursor-pointer border-t hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2 ${s.attivo ? "" : "opacity-50"}`}>
                    <td className="font-medium">
                      {s.ragione_sociale}
                      <span className="ml-2 text-xs text-muted-foreground">{[s.cliente && "cliente", s.fornitore && "fornitore"].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td className="font-mono text-xs">{s.codice}</td>
                    <td>{s.partita_iva}</td>
                    <td>{s.comune}{s.provincia ? ` (${s.provincia})` : ""}</td>
                    <td className="text-muted-foreground">{s.pagamenti?.nome}</td>
                    <td className="text-muted-foreground">{s.listini?.nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {aperto && (
        <SchedaSoggetto
          soggetto={aperto === "nuovo" ? null : aperto}
          nuovoCome={tipo === "fornitori" ? "fornitore" : "cliente"}
          modificabile={aperto === "nuovo" ? puoCreare : perms.gestire_anagrafiche}
          onClose={() => setAperto(null)}
        />
      )}
    </Pagina>
  );
}

const VUOTO: Partial<Soggetto> = { cliente: true, fornitore: false, nazione: "IT", sconto: 0, attivo: true };

export function SchedaSoggetto({
  soggetto,
  nuovoCome,
  modificabile,
  onClose,
  onCreato,
}: {
  soggetto: Soggetto | null;
  nuovoCome: "cliente" | "fornitore";
  modificabile: boolean;
  onClose: () => void;
  onCreato?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [s, setS] = useState<Partial<Soggetto>>(
    soggetto ?? { ...VUOTO, cliente: nuovoCome === "cliente", fornitore: nuovoCome === "fornitore" },
  );
  const pagamenti = usePagamenti();
  const listini = useListini();
  const agenti = useQuery({
    queryKey: ["profili", "agenti"],
    queryFn: async () => ok(await supabase.from("profili").select("id, nome, cognome, ruolo").eq("attivo", true).order("nome")),
  });
  const set = <K extends keyof Soggetto>(k: K, v: Soggetto[K] | null) => setS((x) => ({ ...x, [k]: v }));
  const t = (k: keyof Soggetto) => (s[k] as string | null | undefined) ?? "";
  const salva = useMutation({
    mutationFn: async () => {
      const dati = {
        codice: s.codice?.trim() || null,
        ragione_sociale: (s.ragione_sociale ?? "").trim(),
        cliente: !!s.cliente,
        fornitore: !!s.fornitore,
        partita_iva: s.partita_iva?.trim() || null,
        codice_fiscale: s.codice_fiscale?.trim().toUpperCase() || null,
        indirizzo: s.indirizzo || null,
        cap: s.cap || null,
        comune: s.comune || null,
        provincia: s.provincia?.toUpperCase().slice(0, 2) || null,
        nazione: s.nazione || "IT",
        telefono: s.telefono || null,
        email: s.email || null,
        pec: s.pec || null,
        codice_sdi: s.codice_sdi?.toUpperCase() || null,
        pagamento_id: s.pagamento_id ?? null,
        listino_id: s.listino_id ?? null,
        sconto: s.sconto ?? 0,
        fido: s.fido ?? null,
        agente_id: s.agente_id ?? null,
        note: s.note || null,
        attivo: s.attivo ?? true,
      };
      if (!dati.ragione_sociale) throw new Error("Indica la ragione sociale");
      if (!dati.cliente && !dati.fornitore) throw new Error("Scegli cliente e/o fornitore");
      if (soggetto) return ok(await supabase.from("soggetti").update(dati).eq("id", soggetto.id).select("id").single()).id;
      return ok(await supabase.from("soggetti").insert(dati).select("id").single()).id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["soggetti"] });
      toast.success("Salvato");
      onCreato?.(id);
      onClose();
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const dis = !modificabile;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{soggetto ? soggetto.ragione_sociale : `Nuovo ${nuovoCome}`}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-6">
          <Campo label="Ragione sociale" className="sm:col-span-4">
            <Input value={t("ragione_sociale")} disabled={dis} onChange={(e) => set("ragione_sociale", e.target.value)} />
          </Campo>
          <Campo label="Codice" className="sm:col-span-2">
            <Input value={t("codice")} disabled={dis} onChange={(e) => set("codice", e.target.value)} />
          </Campo>
          <div className="flex items-center gap-6 sm:col-span-6">
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!s.cliente} disabled={dis} onCheckedChange={(v) => set("cliente", v)} /> Cliente</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!s.fornitore} disabled={dis} onCheckedChange={(v) => set("fornitore", v)} /> Fornitore</label>
            <label className="ml-auto flex items-center gap-2 text-sm"><Switch checked={s.attivo ?? true} disabled={dis} onCheckedChange={(v) => set("attivo", v)} /> Attivo</label>
          </div>
          <Campo label="Partita IVA" className="sm:col-span-3"><Input value={t("partita_iva")} disabled={dis} onChange={(e) => set("partita_iva", e.target.value)} /></Campo>
          <Campo label="Codice fiscale" className="sm:col-span-3"><Input value={t("codice_fiscale")} disabled={dis} onChange={(e) => set("codice_fiscale", e.target.value)} /></Campo>
          <Campo label="Indirizzo" className="sm:col-span-6"><Input value={t("indirizzo")} disabled={dis} onChange={(e) => set("indirizzo", e.target.value)} /></Campo>
          <Campo label="CAP"><Input value={t("cap")} disabled={dis} onChange={(e) => set("cap", e.target.value)} /></Campo>
          <Campo label="Comune" className="sm:col-span-4"><Input value={t("comune")} disabled={dis} onChange={(e) => set("comune", e.target.value)} /></Campo>
          <Campo label="Prov."><Input value={t("provincia")} maxLength={2} disabled={dis} onChange={(e) => set("provincia", e.target.value)} /></Campo>
          <Campo label="Telefono" className="sm:col-span-2"><Input value={t("telefono")} disabled={dis} onChange={(e) => set("telefono", e.target.value)} /></Campo>
          <Campo label="Email" className="sm:col-span-2"><Input type="email" value={t("email")} disabled={dis} onChange={(e) => set("email", e.target.value)} /></Campo>
          <Campo label="PEC" className="sm:col-span-2"><Input value={t("pec")} disabled={dis} onChange={(e) => set("pec", e.target.value)} /></Campo>
          <Campo label="Codice SDI" className="sm:col-span-2"><Input value={t("codice_sdi")} maxLength={7} disabled={dis} onChange={(e) => set("codice_sdi", e.target.value)} /></Campo>
          <Campo label="Pagamento" className="sm:col-span-2">
            <Select value={s.pagamento_id ?? "_"} disabled={dis} onValueChange={(v) => set("pagamento_id", v === "_" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {(pagamenti.data ?? []).filter((p) => p.attivo || p.id === s.pagamento_id).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Listino" className="sm:col-span-2">
            <Select value={s.listino_id ?? "_"} disabled={dis} onValueChange={(v) => set("listino_id", v === "_" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Predefinito</SelectItem>
                {(listini.data ?? []).filter((l) => !l.soggetto_id && !l.predefinito).map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </Campo>
          {s.cliente && (
            <>
              <Campo label="Sconto cliente %"><CampoNumero valore={s.sconto ?? 0} decimali={2} disabled={dis} onChange={(n) => set("sconto", n ?? 0)} /></Campo>
              <Campo label="Fido €"><CampoNumero valore={s.fido ?? null} vuotoNull decimali={2} disabled={dis} onChange={(n) => set("fido", n)} /></Campo>
              <Campo label="Agente" className="sm:col-span-2">
                <Select value={s.agente_id ?? "_"} disabled={dis} onValueChange={(v) => set("agente_id", v === "_" ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">—</SelectItem>
                    {(agenti.data ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{`${a.nome} ${a.cognome}`.trim() || "(senza nome)"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Campo>
            </>
          )}
          <Campo label="Note" className="sm:col-span-6"><Textarea value={t("note")} disabled={dis} rows={2} onChange={(e) => set("note", e.target.value)} /></Campo>
        </div>
        {soggetto && <Destinazioni soggettoId={soggetto.id} modificabile={modificabile} />}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Chiudi</Button>
          {modificabile && <Button onClick={() => salva.mutate()} disabled={salva.isPending}>{salva.isPending ? "Salvataggio…" : "Salva"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Destinazioni({ soggettoId, modificabile }: { soggettoId: string; modificabile: boolean }) {
  const qc = useQueryClient();
  const lista = useQuery({
    queryKey: ["destinazioni", soggettoId],
    queryFn: async () => ok(await supabase.from("destinazioni").select("*").eq("soggetto_id", soggettoId).order("nome")),
  });
  const [nuova, setNuova] = useState({ nome: "", indirizzo: "", cap: "", comune: "", provincia: "" });
  useEffect(() => setNuova({ nome: "", indirizzo: "", cap: "", comune: "", provincia: "" }), [soggettoId]);
  const aggiungi = useMutation({
    mutationFn: async () => {
      if (!nuova.nome.trim()) throw new Error("Indica il nome della destinazione");
      ok(await supabase.from("destinazioni").insert({ ...nuova, soggetto_id: soggettoId, provincia: nuova.provincia.toUpperCase() || null }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["destinazioni", soggettoId] });
      setNuova({ nome: "", indirizzo: "", cap: "", comune: "", provincia: "" });
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const togli = useMutation({
    mutationFn: async (id: string) => ok(await supabase.from("destinazioni").delete().eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["destinazioni", soggettoId] }),
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  return (
    <div className="mt-2 border-t pt-4">
      <h3 className="mb-2 text-sm font-semibold">Destinazioni di consegna</h3>
      {lista.data?.map((d) => (
        <div key={d.id} className="flex items-center gap-2 py-1 text-sm">
          <span className="font-medium">{d.nome}</span>
          <span className="text-muted-foreground">{[d.indirizzo, d.cap, d.comune, d.provincia].filter(Boolean).join(" ")}</span>
          {modificabile && (
            <Button size="icon" variant="ghost" className="ml-auto h-7 w-7 text-destructive" onClick={() => togli.mutate(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          )}
        </div>
      ))}
      {modificabile && (
        <div className="mt-2 grid gap-2 sm:grid-cols-12">
          <Input className="sm:col-span-3" placeholder="Nome (es. Punto vendita)" value={nuova.nome} onChange={(e) => setNuova({ ...nuova, nome: e.target.value })} />
          <Input className="sm:col-span-4" placeholder="Indirizzo" value={nuova.indirizzo} onChange={(e) => setNuova({ ...nuova, indirizzo: e.target.value })} />
          <Input className="sm:col-span-1" placeholder="CAP" value={nuova.cap} onChange={(e) => setNuova({ ...nuova, cap: e.target.value })} />
          <Input className="sm:col-span-2" placeholder="Comune" value={nuova.comune} onChange={(e) => setNuova({ ...nuova, comune: e.target.value })} />
          <Input className="sm:col-span-1" placeholder="Pr" maxLength={2} value={nuova.provincia} onChange={(e) => setNuova({ ...nuova, provincia: e.target.value })} />
          <Button className="sm:col-span-1" variant="outline" onClick={() => aggiungi.mutate()}><Plus className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}
