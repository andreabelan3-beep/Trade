import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Pagina } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, CampoNumero } from "@/components/comuni/Campi";
import { SceltaSoggetto, useListini } from "@/components/comuni/Scelte";
import { ok, supabase } from "@/lib/dati";
import { formatData, formatNum, messaggioErrore } from "@/lib/formato";

export const Route = createFileRoute("/_authenticated/listini/")({
  head: () => ({ meta: [{ title: "Listini — Trade" }] }),
  component: Listini,
});

function Listini() {
  const { perms } = Route.useRouteContext();
  const listini = useListini();
  const [nuovo, setNuovo] = useState(false);
  const generali = (listini.data ?? []).filter((l) => !l.soggetto_id);
  const dedicati = (listini.data ?? []).filter((l) => l.soggetto_id);
  const riga = (l: NonNullable<typeof listini.data>[number]) => (
    <Link key={l.id} to="/listini/$id" params={{ id: l.id }} className={`flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 ${l.attivo ? "" : "opacity-50"}`}>
      <span className="font-medium">{l.soggetti?.ragione_sociale ?? l.nome}</span>
      {l.predefinito && <span className="rounded bg-primary/10 px-1.5 text-xs text-primary">predefinito</span>}
      <span className="ml-auto text-xs text-muted-foreground">
        {l.ricarico !== null ? `ricarico ${formatNum(l.ricarico)}%` : ""}
        {l.valido_al ? ` · fino al ${formatData(l.valido_al)}` : ""}
      </span>
    </Link>
  );
  return (
    <Pagina titolo="Listini" azioni={perms.gestire_listini && <Button onClick={() => setNuovo(true)}><Plus className="mr-1 h-4 w-4" /> Nuovo listino</Button>}>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Il prezzo di vendita si cerca in quest'ordine: listino dedicato al cliente → listino assegnato nella sua scheda → listino
        predefinito → costo × ricarico (articolo, categoria o listino predefinito). Ogni prezzo può avere scaglioni per quantità.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 font-semibold">Listini generali</h2>
          <div className="divide-y rounded-lg border bg-card">{generali.map(riga)}</div>
        </section>
        <section>
          <h2 className="mb-2 font-semibold">Listini dedicati ai clienti</h2>
          <div className="divide-y rounded-lg border bg-card">
            {dedicati.map(riga)}
            {!dedicati.length && <p className="p-3 text-sm text-muted-foreground">Nessun listino dedicato.</p>}
          </div>
        </section>
      </div>
      {nuovo && <NuovoListino onClose={() => setNuovo(false)} />}
    </Pagina>
  );
}

function NuovoListino({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [cliente, setCliente] = useState<string | null>(null);
  const [ricarico, setRicarico] = useState<number | null>(null);
  const crea = useMutation({
    mutationFn: async () => ok(await supabase.from("listini").insert({ nome: nome.trim() || "Listino", soggetto_id: cliente, ricarico }).select("id").single()).id,
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["listini"] });
      navigate({ to: "/listini/$id", params: { id } });
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuovo listino</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Campo label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Rivenditori 2027" /></Campo>
          <Campo label="Dedicato al cliente (facoltativo)">
            <SceltaSoggetto ruolo="cliente" valore={cliente} onChange={(id, s) => { setCliente(id); if (s && !nome) setNome(s.ragione_sociale); }} placeholder="Listino generale" />
          </Campo>
          <Campo label="Ricarico % per gli articoli fuori elenco (facoltativo)"><CampoNumero valore={ricarico} vuotoNull decimali={2} onChange={setRicarico} /></Campo>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={() => crea.mutate()} disabled={crea.isPending}>Crea</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
