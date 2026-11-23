import { cn } from "@/lib/utils";

const COLORI: Record<string, string> = {
  bozza: "bg-muted text-muted-foreground",
  confermato: "bg-sky-100 text-sky-800",
  fatturato: "bg-emerald-100 text-emerald-800",
  annullato: "bg-red-100 text-red-700 line-through",
  inviata: "bg-sky-100 text-sky-800",
  accettata: "bg-emerald-100 text-emerald-800",
  rifiutata: "bg-red-100 text-red-700",
  da_evadere: "bg-amber-100 text-amber-800",
  parziale: "bg-orange-100 text-orange-800",
  evaso: "bg-emerald-100 text-emerald-800",
  chiuso: "bg-slate-200 text-slate-700",
  aperta: "bg-amber-100 text-amber-800",
  saldata: "bg-emerald-100 text-emerald-800",
  scaduto: "bg-red-100 text-red-700",
  in_scadenza: "bg-amber-100 text-amber-800",
};
const TESTI: Record<string, string> = {
  bozza: "Bozza",
  confermato: "Confermato",
  fatturato: "In fattura",
  annullato: "Annullato",
  inviata: "Inviata",
  accettata: "Accettata",
  rifiutata: "Rifiutata",
  da_evadere: "Da evadere",
  parziale: "Evaso in parte",
  evaso: "Evaso",
  chiuso: "Chiuso",
  aperta: "Aperta",
  saldata: "Saldata",
  scaduto: "Scaduto",
  in_scadenza: "In scadenza",
};

export function Stato({ stato, className }: { stato: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", COLORI[stato] ?? "bg-muted", className)}>
      {TESTI[stato] ?? stato}
    </span>
  );
}

/** Riquadro numerico del cruscotto. */
export function Kpi({
  titolo,
  valore,
  nota,
  tono,
}: {
  titolo: string;
  valore: string;
  nota?: string | undefined;
  tono?: "allerta" | "ok" | undefined;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titolo}</p>
      <p className={cn("tabular mt-1 text-2xl font-semibold", tono === "allerta" && "text-destructive", tono === "ok" && "text-emerald-700")}>
        {valore}
      </p>
      {nota && <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>}
    </div>
  );
}

export function Vuoto({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}
