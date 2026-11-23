import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Plus, Search } from "lucide-react";
import { Pagina } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stato, Vuoto } from "@/components/comuni/Stato";
import { ok, supabase } from "@/lib/dati";
import { formatData, formatEuro, messaggioErrore, oggi } from "@/lib/formato";
import { xmlEasyfatt, type DdtDanea } from "@/lib/danea";
import { scaricaFile } from "@/lib/documento-pdf";

type Search = { direzione?: "uscita" | "entrata"; stato?: string };

export const Route = createFileRoute("/_authenticated/ddt/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    direzione: s["direzione"] === "entrata" ? "entrata" : "uscita",
    stato: typeof s["stato"] === "string" ? s["stato"] : "tutti",
  }),
  head: () => ({ meta: [{ title: "DDT — Trade" }] }),
  component: ElencoDdt,
});

export const CAUSALI_DDT: Record<string, string> = {
  vendita: "Vendita",
  acquisto: "Acquisto",
  reso_cliente: "Reso da cliente",
  reso_fornitore: "Reso a fornitore",
  conto_visione: "Conto visione",
  omaggio: "Omaggio",
};

function ElencoDdt() {
  const { direzione = "uscita", stato = "tutti" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { perms } = Route.useRouteContext();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [scelti, setScelti] = useState<string[]>([]);
  const lista = useQuery({
    queryKey: ["ddt", "elenco", direzione, stato],
    queryFn: async () => {
      let r = supabase.from("ddt_elenco").select("*").eq("direzione", direzione);
      if (stato !== "tutti") r = r.eq("stato", stato);
      return ok(await r.order("data", { ascending: false }).order("numero_int", { ascending: false, nullsFirst: true }).limit(500));
    },
  });
  const filtrati = (lista.data ?? []).filter((d) => {
    const t = q.trim().toLowerCase();
    return !t || `${d.numero ?? ""} ${d.ragione_sociale ?? ""}`.toLowerCase().includes(t);
  });
  const esportabili = filtrati.filter((d) => d.stato === "confermato" && d.direzione === "uscita");

  const esporta = useMutation({
    mutationFn: async (ids: string[]) => {
      const dati = ok(
        await supabase
          .from("ddt")
          .select("id, numero_int, data, causale, vettore, aspetto_beni, colli, peso, porto, inizio_trasporto, note, soggetti(codice, ragione_sociale, indirizzo, cap, comune, provincia, codice_fiscale, partita_iva, codice_sdi, pec, email, pagamenti(nome)), destinazioni(nome, indirizzo, cap, comune, provincia), pagamenti(nome), ddt_righe(id, posizione, codice, descrizione, um, qta, prezzo, sconto, iva, lotto, scadenza)")
          .in("id", ids)
          .order("numero_int"),
      );
      const lotti = ok(await supabase.from("ddt_righe_lotti").select("*").in("ddt_riga_id", dati.flatMap((d) => d.ddt_righe.map((r) => r.id))));
      const docs: DdtDanea[] = dati.map((d) => {
        const s = d.soggetti!;
        return {
          id: d.id,
          numero: d.numero_int,
          data: d.data,
          causale: d.causale,
          cliente: { codice: s.codice, nome: s.ragione_sociale, indirizzo: s.indirizzo, cap: s.cap, citta: s.comune, provincia: s.provincia,
            codiceFiscale: s.codice_fiscale, partitaIva: s.partita_iva, codiceSdi: s.codice_sdi, pec: s.pec, email: s.email },
          destinazione: d.destinazioni ? { nome: d.destinazioni.nome, indirizzo: d.destinazioni.indirizzo, cap: d.destinazioni.cap, citta: d.destinazioni.comune, provincia: d.destinazioni.provincia } : null,
          pagamento: d.pagamenti?.nome ?? s.pagamenti?.nome ?? null,
          vettore: d.vettore, aspetto: d.aspetto_beni, colli: d.colli, peso: d.peso, porto: d.porto, inizioTrasporto: d.inizio_trasporto, note: d.note,
          // una riga per lotto effettivamente scaricato (FEFO), così Easyfatt riceve lotto e scadenza
          righe: d.ddt_righe.sort((a, b) => a.posizione - b.posizione).flatMap((r) => {
            const ls = lotti.filter((l) => l.ddt_riga_id === r.id && l.lotto);
            const base = { codice: r.codice, descrizione: r.descrizione, um: r.um, prezzo: Number(r.prezzo), sconto: Number(r.sconto), iva: Number(r.iva) };
            if (ls.length <= 1) return [{ ...base, quantita: Number(r.qta), lotto: ls[0]?.lotto ?? r.lotto, scadenza: ls[0]?.scadenza ?? r.scadenza }];
            return ls.map((l) => ({ ...base, quantita: Number(l.qta), lotto: l.lotto, scadenza: l.scadenza }));
          }),
        };
      });
      scaricaFile(xmlEasyfatt(docs), `trade-ddt-${oggi()}.DefXml`, "application/xml");
      return ok(await supabase.rpc("segna_ddt_esportati", { _ids: ids }));
    },
    onSuccess: (n) => {
      toast.success(`${n} DDT esportati: importali in Easyfatt da Documenti → Utilità → Importa documenti Easyfatt-Xml`);
      setScelti([]);
      qc.invalidateQueries({ queryKey: ["ddt"] });
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });

  const puoUscita = perms.gestire_vendite || perms.gestire_magazzino;
  const puoEntrata = perms.gestire_acquisti || perms.gestire_magazzino;
  return (
    <Pagina titolo="Documenti di trasporto" largo
      azioni={
        <>
          {direzione === "uscita" && puoUscita && <Button asChild><Link to="/ddt/nuovo" search={{ direzione: "uscita" }}><Plus className="mr-1 h-4 w-4" /> Nuovo DDT</Link></Button>}
          {direzione === "entrata" && puoEntrata && <Button asChild><Link to="/ddt/nuovo" search={{ direzione: "entrata" }}><Plus className="mr-1 h-4 w-4" /> Registra DDT fornitore</Link></Button>}
        </>
      }>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={direzione} onValueChange={(v) => { setScelti([]); navigate({ search: { direzione: v as "uscita" | "entrata", stato } }); }}>
          <TabsList>
            <TabsTrigger value="uscita">In uscita</TabsTrigger>
            <TabsTrigger value="entrata">In entrata</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={stato} onValueChange={(v) => navigate({ search: { direzione, stato: v } })}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            <SelectItem value="bozza">Bozze</SelectItem>
            <SelectItem value="confermato">{direzione === "uscita" ? "Da fatturare" : "Confermati"}</SelectItem>
            {direzione === "uscita" && <SelectItem value="fatturato">In fattura</SelectItem>}
            <SelectItem value="annullato">Annullati</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Numero o cliente/fornitore" className="pl-9" />
        </div>
        {direzione === "uscita" && perms.gestire_vendite && (
          <Button variant="outline" disabled={!scelti.length || esporta.isPending} onClick={() => esporta.mutate(scelti)}>
            <Download className="mr-1 h-4 w-4" /> Esporta per Danea ({scelti.length})
          </Button>
        )}
      </div>
      <div className="mt-4">
        {filtrati.length === 0 && <Vuoto>Nessun DDT.</Vuoto>}
        {filtrati.length > 0 && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  {direzione === "uscita" && perms.gestire_vendite && (
                    <th className="w-8">
                      <Checkbox checked={esportabili.length > 0 && esportabili.every((d) => scelti.includes(d.id!))}
                        onCheckedChange={(v) => setScelti(v ? esportabili.map((d) => d.id!) : [])} aria-label="Tutti da fatturare" />
                    </th>
                  )}
                  <th>Numero</th><th>Data</th><th>{direzione === "uscita" ? "Cliente" : "Fornitore"}</th><th>Causale</th><th className="!text-right">Imponibile</th><th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {filtrati.map((d) => (
                  <tr key={d.id} className="border-t hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2">
                    {direzione === "uscita" && perms.gestire_vendite && (
                      <td>
                        {d.stato === "confermato" && (
                          <Checkbox checked={scelti.includes(d.id!)} onCheckedChange={(v) => setScelti(v ? [...scelti, d.id!] : scelti.filter((x) => x !== d.id))} />
                        )}
                      </td>
                    )}
                    <td className="font-medium"><Link to="/ddt/$id" params={{ id: d.id! }} className="hover:underline">{d.numero ?? "(bozza)"}</Link></td>
                    <td className="tabular">{formatData(d.data)}</td>
                    <td><Link to="/ddt/$id" params={{ id: d.id! }} className="hover:underline">{d.ragione_sociale ?? "—"}</Link></td>
                    <td className="text-muted-foreground">{CAUSALI_DDT[d.causale!]}</td>
                    <td className="tabular text-right">{formatEuro(d.imponibile)}</td>
                    <td><Stato stato={d.stato!} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Pagina>
  );
}
