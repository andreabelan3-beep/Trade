import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Plus, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Pagina } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, CampoNumero } from "@/components/comuni/Campi";
import { SceltaSoggetto } from "@/components/comuni/Scelte";
import { Kpi, Vuoto } from "@/components/comuni/Stato";
import { ok, supabase } from "@/lib/dati";
import { formatData, formatEuro, messaggioErrore, oggi, traGiorni, tondo } from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/scadenzario")({
  head: () => ({ meta: [{ title: "Scadenzario — Trade" }] }),
  component: Scadenzario,
});

const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function Scadenzario() {
  const qc = useQueryClient();
  const [giorni, setGiorni] = useState("120");
  const [saldoIniziale, setSaldoIniziale] = useState<number | null>(null);
  const [nuova, setNuova] = useState(false);
  const al = traGiorni(Number(giorni));
  const dati = useQuery({
    queryKey: ["scadenzario", giorni],
    queryFn: async () => ok(await supabase.rpc("previsionale", { _dal: oggi(), _al: al })),
  });
  const righe = dati.data ?? [];
  const scaduti = righe.filter((r) => r.data < oggi());
  const future = righe.filter((r) => r.data >= oggi());

  const mesi = useMemo(() => {
    const m = new Map<string, { mese: string; incassi: number; pagamenti: number; stimati: number }>();
    for (const r of future) {
      const k = r.data.slice(0, 7);
      const v = m.get(k) ?? { mese: `${MESI[Number(k.slice(5)) - 1]} ${k.slice(2, 4)}`, incassi: 0, pagamenti: 0, stimati: 0 };
      if (r.tipo === "incasso") v.incassi = tondo(v.incassi + Number(r.importo));
      else v.pagamenti = tondo(v.pagamenti + Number(r.importo));
      if (r.certezza === "ordine") v.stimati = tondo(v.stimati + Number(r.importo) * (r.tipo === "incasso" ? 1 : -1));
      m.set(k, v);
    }
    let cum = saldoIniziale ?? 0;
    return [...m.entries()].sort().map(([, v]) => {
      cum = tondo(cum + v.incassi - v.pagamenti);
      return { ...v, saldo: cum };
    });
  }, [future, saldoIniziale]);

  const salda = useMutation({
    mutationFn: async (id: string) => {
      const sc = ok(await supabase.from("scadenze").select("data, ripeti_mesi, ripeti_fino").eq("id", id).single());
      if (sc.ripeti_mesi) {
        // scadenza che si ripete: saldata questa volta, la serie riparte dalla prossima
        const d = new Date(`${sc.data}T12:00:00Z`);
        d.setUTCMonth(d.getUTCMonth() + sc.ripeti_mesi);
        const prossima = d.toISOString().slice(0, 10);
        if (!sc.ripeti_fino || prossima <= sc.ripeti_fino) {
          ok(await supabase.from("scadenze").update({ data: prossima }).eq("id", id));
          return;
        }
      }
      ok(await supabase.from("scadenze").update({ stato: "saldata", saldata_il: oggi() }).eq("id", id));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scadenzario"] }); qc.invalidateQueries({ queryKey: ["cruscotto"] }); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const togli = useMutation({
    mutationFn: async (id: string) => ok(await supabase.from("scadenze").delete().eq("id", id).eq("origine", "manuale")),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scadenzario"] }),
    onError: (e) => toast.error(messaggioErrore(e)),
  });

  const somma = (rs: typeof righe, t: string) => rs.filter((r) => r.tipo === t).reduce((s, r) => s + Number(r.importo), 0);
  const tabella = (rs: typeof righe) => (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium"><th>Data</th><th>Soggetto</th><th>Descrizione</th><th className="!text-right">Incasso</th><th className="!text-right">Pagamento</th><th /></tr>
        </thead>
        <tbody>
          {rs.map((r, i) => (
            <tr key={`${r.scadenza_id ?? r.ordine_id}-${r.data}-${i}`} className={`border-t [&>td]:px-3 [&>td]:py-2 ${r.certezza === "ordine" ? "text-muted-foreground italic" : ""}`}>
              <td className="tabular">{formatData(r.data)}</td>
              <td>{r.soggetto}</td>
              <td>{r.ordine_id ? <Link to="/ordini/$id" params={{ id: r.ordine_id }} className="hover:underline">{r.descrizione}</Link> : r.descrizione}</td>
              <td className="tabular text-right text-emerald-700">{r.tipo === "incasso" ? formatEuro(r.importo) : ""}</td>
              <td className="tabular text-right text-destructive">{r.tipo === "pagamento" ? formatEuro(r.importo) : ""}</td>
              <td className="whitespace-nowrap text-right">
                {r.scadenza_id && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => salda.mutate(r.scadenza_id!)} title="Segna saldata"><Check className="h-4 w-4" /></Button>
                    {!r.descrizione.startsWith("DDT ") && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => window.confirm("Eliminare la scadenza (e le sue ripetizioni)?") && togli.mutate(r.scadenza_id!)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Pagina titolo="Scadenzario e previsionale" largo azioni={<Button onClick={() => setNuova(true)}><Plus className="mr-1 h-4 w-4" /> Scadenza manuale</Button>}>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Le scadenze dei DDT nascono alla conferma (fattura differita a fine mese + condizioni di pagamento del cliente o fornitore).
        In corsivo le stime dagli ordini ancora da evadere. Le scadenze manuali (affitti, stipendi, F24) si possono ripetere ogni mese.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Campo label="Orizzonte">
          <Select value={giorni} onValueChange={setGiorni}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 giorni</SelectItem><SelectItem value="60">60 giorni</SelectItem>
              <SelectItem value="120">4 mesi</SelectItem><SelectItem value="365">12 mesi</SelectItem>
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="Saldo di partenza (banca + cassa)"><CampoNumero valore={saldoIniziale} vuotoNull decimali={2} className="w-48" onChange={setSaldoIniziale} /></Campo>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi titolo="Incassi previsti" valore={formatEuro(somma(future, "incasso"))} />
        <Kpi titolo="Pagamenti previsti" valore={formatEuro(somma(future, "pagamento"))} />
        <Kpi titolo="Saldo a fine periodo" valore={formatEuro((saldoIniziale ?? 0) + somma(future, "incasso") - somma(future, "pagamento"))}
          tono={(saldoIniziale ?? 0) + somma(future, "incasso") - somma(future, "pagamento") < 0 ? "allerta" : undefined} />
        <Kpi titolo="Scaduti da incassare" valore={formatEuro(somma(scaduti, "incasso"))} tono={somma(scaduti, "incasso") ? "allerta" : "ok"}
          nota={somma(scaduti, "pagamento") ? `e ${formatEuro(somma(scaduti, "pagamento"))} da pagare` : undefined} />
      </div>
      {mesi.length > 0 && (
        <div className="mt-6 h-72 rounded-lg border bg-card p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mesi}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mese" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => formatEuro(v)} />
              <Legend />
              <Bar dataKey="incassi" name="Incassi" fill="#2f8f6f" radius={[3, 3, 0, 0]} />
              <Bar dataKey="pagamenti" name="Pagamenti" fill="#c2553f" radius={[3, 3, 0, 0]} />
              <Bar dataKey="saldo" name="Saldo progressivo" fill="#1f6f7a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {scaduti.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold text-destructive">Scaduti e non saldati</h2>
          {tabella(scaduti)}
        </section>
      )}
      <section className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">Prossime scadenze</h2>
        {future.length ? tabella(future) : <Vuoto>Nessuna scadenza nel periodo.</Vuoto>}
      </section>
      {nuova && <NuovaScadenza onClose={() => setNuova(false)} />}
    </Pagina>
  );
}

function NuovaScadenza({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [s, setS] = useState({ tipo: "pagamento", data: oggi(), importo: null as number | null, descrizione: "", soggetto_id: null as string | null, ripeti_mesi: "0", ripeti_fino: "" });
  const crea = useMutation({
    mutationFn: async () => {
      if (!s.importo || !s.descrizione.trim()) throw new Error("Indica importo e descrizione");
      ok(await supabase.from("scadenze").insert({
        tipo: s.tipo, data: s.data, importo: s.importo, descrizione: s.descrizione.trim(), soggetto_id: s.soggetto_id,
        ripeti_mesi: s.ripeti_mesi === "0" ? null : Number(s.ripeti_mesi), ripeti_fino: s.ripeti_fino || null,
      }));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scadenzario"] }); onClose(); },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuova scadenza</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Tipo">
            <Select value={s.tipo} onValueChange={(v) => setS({ ...s, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pagamento">Pagamento (uscita)</SelectItem><SelectItem value="incasso">Incasso (entrata)</SelectItem></SelectContent>
            </Select>
          </Campo>
          <Campo label="Data"><Input type="date" value={s.data} onChange={(e) => setS({ ...s, data: e.target.value })} /></Campo>
          <Campo label="Importo €"><CampoNumero valore={s.importo} vuotoNull decimali={2} onChange={(n) => setS({ ...s, importo: n })} /></Campo>
          <Campo label="Ripeti">
            <Select value={s.ripeti_mesi} onValueChange={(v) => setS({ ...s, ripeti_mesi: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Una volta</SelectItem><SelectItem value="1">Ogni mese</SelectItem>
                <SelectItem value="2">Ogni 2 mesi</SelectItem><SelectItem value="3">Ogni 3 mesi</SelectItem>
                <SelectItem value="6">Ogni 6 mesi</SelectItem><SelectItem value="12">Ogni anno</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Descrizione" className="col-span-2"><Input value={s.descrizione} onChange={(e) => setS({ ...s, descrizione: e.target.value })} placeholder="es. Affitto magazzino" /></Campo>
          <Campo label="Cliente/fornitore (facoltativo)" className="col-span-2"><SceltaSoggetto valore={s.soggetto_id} onChange={(v) => setS({ ...s, soggetto_id: v })} placeholder="—" /></Campo>
          {s.ripeti_mesi !== "0" && <Campo label="Ripeti fino al (vuoto = sempre)"><Input type="date" value={s.ripeti_fino} onChange={(e) => setS({ ...s, ripeti_fino: e.target.value })} /></Campo>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={() => crea.mutate()} disabled={crea.isPending}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
