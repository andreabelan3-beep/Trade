import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Pagina } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stato, Vuoto } from "@/components/comuni/Stato";
import { NuovoDocumento } from "@/components/documenti/NuovoDocumento";
import { ok, supabase } from "@/lib/dati";
import { formatData, formatEuro, oggi } from "@/lib/formato";

type Search = { tipo?: "cliente" | "fornitore"; vista?: "aperti" | "tutti" };

export const Route = createFileRoute("/_authenticated/ordini/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tipo: s["tipo"] === "fornitore" ? "fornitore" : "cliente",
    vista: s["vista"] === "tutti" ? "tutti" : "aperti",
  }),
  head: () => ({ meta: [{ title: "Ordini — Trade" }] }),
  component: Ordini,
});

function Ordini() {
  const { tipo = "cliente", vista = "aperti" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { perms } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const [nuovo, setNuovo] = useState(false);
  const lista = useQuery({
    queryKey: ["ordini", "elenco", tipo, vista],
    queryFn: async () => {
      let r = supabase.from("ordini_elenco").select("*").eq("tipo", tipo);
      if (vista === "aperti") r = r.in("evasione", ["da_evadere", "parziale", "bozza"]);
      return ok(await r.order("data", { ascending: false }).order("numero_int", { ascending: false }).limit(500));
    },
  });
  const filtrati = (lista.data ?? []).filter((o) => {
    const t = q.trim().toLowerCase();
    return !t || `${o.numero} ${o.ragione_sociale} ${o.riferimento ?? ""}`.toLowerCase().includes(t);
  });
  const puo = tipo === "cliente" ? perms.gestire_vendite || perms.gestire_magazzino : perms.gestire_acquisti || perms.gestire_magazzino;
  return (
    <Pagina titolo="Ordini" largo azioni={puo && <Button onClick={() => setNuovo(true)}><Plus className="mr-1 h-4 w-4" /> Nuovo ordine {tipo === "cliente" ? "cliente" : "a fornitore"}</Button>}>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tipo} onValueChange={(v) => navigate({ search: { tipo: v as "cliente" | "fornitore", vista } })}>
          <TabsList><TabsTrigger value="cliente">Clienti</TabsTrigger><TabsTrigger value="fornitore">Fornitori</TabsTrigger></TabsList>
        </Tabs>
        <Select value={vista} onValueChange={(v) => navigate({ search: { tipo, vista: v as "aperti" | "tutti" } })}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="aperti">Da evadere</SelectItem><SelectItem value="tutti">Tutti</SelectItem></SelectContent>
        </Select>
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Numero, nome, riferimento" className="pl-9" />
        </div>
      </div>
      <div className="mt-4">
        {filtrati.length === 0 && <Vuoto>Nessun ordine.</Vuoto>}
        {filtrati.length > 0 && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  <th>Numero</th><th>Data</th><th>{tipo === "cliente" ? "Cliente" : "Fornitore"}</th><th>Rif.</th><th>Consegna</th>
                  <th className="!text-right">Totale</th><th className="!text-right">Residuo</th><th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {filtrati.map((o) => (
                  <tr key={o.id} className="border-t hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2">
                    <td className="font-medium"><Link to="/ordini/$id" params={{ id: o.id! }} className="hover:underline">{o.numero}</Link></td>
                    <td className="tabular">{formatData(o.data)}</td>
                    <td><Link to="/ordini/$id" params={{ id: o.id! }} className="hover:underline">{o.ragione_sociale}</Link></td>
                    <td className="text-muted-foreground">{o.riferimento}</td>
                    <td className={`tabular ${o.data_consegna && o.data_consegna < oggi() && (o.evasione === "da_evadere" || o.evasione === "parziale") ? "font-medium text-destructive" : ""}`}>
                      {formatData(o.data_consegna)}
                    </td>
                    <td className="tabular text-right">{formatEuro(o.imponibile)}</td>
                    <td className="tabular text-right">{Number(o.residuo_valore) ? formatEuro(o.residuo_valore) : ""}</td>
                    <td><Stato stato={o.evasione!} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {nuovo && <NuovoDocumento tipo={tipo === "cliente" ? "ordine_cliente" : "ordine_fornitore"} onClose={() => setNuovo(false)} />}
    </Pagina>
  );
}
