import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Pagina } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stato, Vuoto } from "@/components/comuni/Stato";
import { NuovoDocumento } from "@/components/documenti/NuovoDocumento";
import { ok, supabase } from "@/lib/dati";
import { formatData, formatEuro, oggi } from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/offerte/")({
  head: () => ({ meta: [{ title: "Offerte — Trade" }] }),
  component: Offerte,
});

function Offerte() {
  const [q, setQ] = useState("");
  const [nuova, setNuova] = useState(false);
  const lista = useQuery({
    queryKey: ["offerte", "elenco"],
    queryFn: async () => ok(await supabase.from("offerte_elenco").select("*").order("data", { ascending: false }).order("numero_int", { ascending: false }).limit(500)),
  });
  const filtrati = (lista.data ?? []).filter((o) => {
    const t = q.trim().toLowerCase();
    return !t || `${o.numero} ${o.ragione_sociale} ${o.oggetto ?? ""}`.toLowerCase().includes(t);
  });
  return (
    <Pagina titolo="Offerte" azioni={<Button onClick={() => setNuova(true)}><Plus className="mr-1 h-4 w-4" /> Nuova offerta</Button>}>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Numero, cliente, oggetto" className="pl-9" />
      </div>
      <div className="mt-4">
        {filtrati.length === 0 && <Vuoto>Nessuna offerta.</Vuoto>}
        {filtrati.length > 0 && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  <th>Numero</th><th>Data</th><th>Cliente</th><th>Oggetto</th><th>Valida fino</th><th className="!text-right">Imponibile</th><th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {filtrati.map((o) => (
                  <tr key={o.id} className="border-t hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2">
                    <td className="font-medium"><Link to="/offerte/$id" params={{ id: o.id! }} className="hover:underline">{o.numero}</Link></td>
                    <td className="tabular">{formatData(o.data)}</td>
                    <td><Link to="/offerte/$id" params={{ id: o.id! }} className="hover:underline">{o.ragione_sociale}</Link></td>
                    <td className="text-muted-foreground">{o.oggetto}</td>
                    <td className={`tabular ${o.valida_fino && o.valida_fino < oggi() && (o.stato === "bozza" || o.stato === "inviata") ? "text-destructive" : ""}`}>{formatData(o.valida_fino)}</td>
                    <td className="tabular text-right">{formatEuro(o.imponibile)}</td>
                    <td><Stato stato={o.stato!} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {nuova && <NuovoDocumento tipo="offerta" onClose={() => setNuova(false)} />}
    </Pagina>
  );
}
