import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Pagina } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Campo } from "@/components/comuni/Campi";
import { Kpi, Vuoto } from "@/components/comuni/Stato";
import { ok, supabase } from "@/lib/dati";
import { formatData, formatEuro, formatNum, formatPerc, oggi, tondo } from "@/lib/formato";
import { scaricaFile } from "@/lib/documento-pdf";

type Per = "mese" | "cliente" | "articolo" | "categoria" | "agente";
type Search = { scheda?: "vendite" | "magazzino" };

export const Route = createFileRoute("/_authenticated/analisi")({
  validateSearch: (s: Record<string, unknown>): Search => ({ scheda: s["scheda"] === "magazzino" ? "magazzino" : "vendite" }),
  head: () => ({ meta: [{ title: "Analisi — Trade" }] }),
  component: Analisi,
});

const inizioAnno = () => `${oggi().slice(0, 4)}-01-01`;

function csv(righe: (string | number | null)[][]) {
  return "﻿" + righe.map((r) => r.map((c) => {
    const v = c === null ? "" : typeof c === "number" ? String(c).replace(".", ",") : c;
    return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(";")).join("\n");
}

function Analisi() {
  const { scheda = "vendite" } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <Pagina titolo="Analisi economica" largo>
      <Tabs value={scheda} onValueChange={(v) => navigate({ search: { scheda: v as "vendite" | "magazzino" } })}>
        <TabsList><TabsTrigger value="vendite">Vendite e margini</TabsTrigger><TabsTrigger value="magazzino">Magazzino</TabsTrigger></TabsList>
      </Tabs>
      <div className="mt-4">{scheda === "vendite" ? <Vendite /> : <AnalisiMagazzino />}</div>
    </Pagina>
  );
}

function Vendite() {
  const [dal, setDal] = useState(inizioAnno());
  const [al, setAl] = useState(oggi());
  const [per, setPer] = useState<Per>("mese");
  const dati = useQuery({
    queryKey: ["analisi", "vendite", dal, al, per],
    queryFn: async () => ok(await supabase.rpc("analisi_vendite", { _dal: dal, _al: al, _per: per })),
  });
  const r = dati.data ?? [];
  const tot = r.reduce((s, x) => ({ ricavo: s.ricavo + Number(x.ricavo), margine: s.margine + Number(x.margine ?? 0) }), { ricavo: 0, margine: 0 });
  const conCosti = r.some((x) => x.margine !== null);
  const grafico = (per === "mese" ? r : r.slice(0, 15)).map((x) => ({ nome: x.etichetta, ricavo: Number(x.ricavo), margine: Number(x.margine ?? 0) }));
  const link = (x: (typeof r)[number]) =>
    per === "articolo" && x.chiave !== "-" ? <Link to="/articoli/$id" params={{ id: x.chiave }} className="hover:underline">{x.etichetta}</Link> : x.etichetta;

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Campo label="Dal"><Input type="date" value={dal} onChange={(e) => setDal(e.target.value)} /></Campo>
        <Campo label="Al"><Input type="date" value={al} onChange={(e) => setAl(e.target.value)} /></Campo>
        <Campo label="Raggruppa per">
          <Select value={per} onValueChange={(v) => setPer(v as Per)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mese">Mese</SelectItem><SelectItem value="cliente">Cliente</SelectItem>
              <SelectItem value="articolo">Articolo</SelectItem><SelectItem value="categoria">Categoria</SelectItem>
              <SelectItem value="agente">Agente</SelectItem>
            </SelectContent>
          </Select>
        </Campo>
        <Button variant="outline" disabled={!r.length} onClick={() => scaricaFile(csv([
          ["Voce", "Quantità", "Ricavo", "Costo", "Margine", "Margine %", "DDT"],
          ...r.map((x) => [x.etichetta, Number(x.qta), Number(x.ricavo), x.costo === null ? null : Number(x.costo), x.margine === null ? null : Number(x.margine), x.perc_margine === null ? null : Number(x.perc_margine), Number(x.documenti)]),
        ]), `vendite-${per}-${dal}-${al}.csv`, "text/csv")}>
          <Download className="mr-1 h-4 w-4" /> CSV
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi titolo="Venduto (imponibile)" valore={formatEuro(tot.ricavo)} />
        {conCosti && <Kpi titolo="Margine" valore={formatEuro(tondo(tot.margine))} />}
        {conCosti && <Kpi titolo="Margine %" valore={tot.ricavo ? formatPerc(tondo((tot.margine / tot.ricavo) * 100, 1)) : "—"} />}
      </div>
      {grafico.length > 0 && (
        <div className="mt-6 h-72 rounded-lg border bg-card p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={grafico}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="nome" fontSize={11} interval={0} angle={per === "mese" ? 0 : -20} textAnchor={per === "mese" ? "middle" : "end"} height={per === "mese" ? 30 : 60} />
              <YAxis fontSize={12} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <Tooltip formatter={(v: number) => formatEuro(v)} />
              <Bar dataKey="ricavo" name="Ricavo" fill="#1f6f7a" radius={[3, 3, 0, 0]} />
              {conCosti && <Bar dataKey="margine" name="Margine" fill="#6fbf9f" radius={[3, 3, 0, 0]} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-6">
        {r.length === 0 ? <Vuoto>Nessuna vendita nel periodo (contano i DDT di vendita confermati).</Vuoto> : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  <th>Voce</th>{per === "articolo" && <th className="!text-right">Quantità</th>}<th className="!text-right">Ricavo</th>
                  {conCosti && <><th className="!text-right">Costo</th><th className="!text-right">Margine</th><th className="!text-right">%</th></>}
                  <th className="!text-right">DDT</th>
                </tr>
              </thead>
              <tbody>
                {r.map((x) => (
                  <tr key={x.chiave} className="border-t [&>td]:px-3 [&>td]:py-2">
                    <td>{link(x)}</td>
                    {per === "articolo" && <td className="tabular text-right">{formatNum(x.qta)}</td>}
                    <td className="tabular text-right">{formatEuro(x.ricavo)}</td>
                    {conCosti && (
                      <>
                        <td className="tabular text-right text-muted-foreground">{formatEuro(x.costo)}</td>
                        <td className="tabular text-right">{formatEuro(x.margine)}</td>
                        <td className={`tabular text-right ${Number(x.perc_margine) < 10 ? "text-destructive" : Number(x.perc_margine) >= 25 ? "text-emerald-700" : ""}`}>{formatPerc(x.perc_margine)}</td>
                      </>
                    )}
                    <td className="tabular text-right text-muted-foreground">{x.documenti}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Costo = costo medio ponderato dei carichi al momento dello scarico. I resi da cliente si sottraggono.</p>
    </>
  );
}

function AnalisiMagazzino() {
  const dati = useQuery({ queryKey: ["analisi", "magazzino"], queryFn: async () => ok(await supabase.rpc("analisi_magazzino")) });
  const r = (dati.data ?? []).filter((x) => Number(x.qta) !== 0 || Number(x.venduto_90 ?? 0) > 0);
  const valore = r.reduce((s, x) => s + Number(x.valore ?? 0), 0);
  const fermi = r.filter((x) => Number(x.qta) > 0 && !Number(x.venduto_90 ?? 0));
  const conCosti = r.some((x) => x.valore !== null);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {conCosti && <Kpi titolo="Valore del magazzino" valore={formatEuro(tondo(valore))} nota="a costo medio" />}
        <Kpi titolo="Articoli fermi" valore={String(fermi.length)} nota="giacenza senza vendite in 90 giorni" tono={fermi.length ? "allerta" : "ok"} />
        {conCosti && <Kpi titolo="Valore fermo" valore={formatEuro(tondo(fermi.reduce((s, x) => s + Number(x.valore ?? 0), 0)))} />}
        <Kpi titolo="Sotto scorta" valore={String(r.filter((x) => x.sotto_scorta).length)} />
      </div>
      <div className="mt-6 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
              <th>Articolo</th><th className="!text-right">Giacenza</th>{conCosti && <><th className="!text-right">Costo medio</th><th className="!text-right">Valore</th></>}
              <th className="!text-right">Venduto 90 gg</th><th className="!text-right">Copertura</th><th>Ultima vendita</th><th>Prima scadenza</th>
            </tr>
          </thead>
          <tbody>
            {r.map((x) => (
              <tr key={x.articolo_id} className="border-t [&>td]:px-3 [&>td]:py-2">
                <td><Link to="/articoli/$id" params={{ id: x.articolo_id }} className="hover:underline">{x.codice} · {x.descrizione}</Link></td>
                <td className={`tabular text-right ${x.sotto_scorta ? "text-destructive" : ""}`}>{formatNum(x.qta)} {x.um}</td>
                {conCosti && <><td className="tabular text-right text-muted-foreground">{formatEuro(x.costo_medio)}</td><td className="tabular text-right">{formatEuro(x.valore)}</td></>}
                <td className="tabular text-right">{formatNum(x.venduto_90)}</td>
                <td className={`tabular text-right ${Number(x.copertura_giorni) > 180 ? "text-amber-700" : ""}`}>{x.copertura_giorni !== null ? `${formatNum(x.copertura_giorni)} gg` : "—"}</td>
                <td className="tabular">{formatData(x.ultima_vendita)}</td>
                <td className={`tabular ${x.prima_scadenza && x.prima_scadenza < oggi() ? "text-destructive" : ""}`}>{formatData(x.prima_scadenza)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
