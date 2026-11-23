import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { filtroTesto, ok, supabase } from "@/lib/dati";

export type SoggettoBreve = { id: string; ragione_sociale: string; codice: string | null; partita_iva: string | null };

/** Scelta di un cliente o fornitore con ricerca. */
export function SceltaSoggetto({
  valore,
  onChange,
  ruolo,
  disabled,
  placeholder = "Scegli…",
}: {
  valore: string | null;
  onChange: (id: string | null, s: SoggettoBreve | null) => void;
  ruolo?: "cliente" | "fornitore" | undefined;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const scelto = useQuery({
    queryKey: ["soggetti", "uno", valore],
    enabled: !!valore,
    queryFn: async () =>
      ok(await supabase.from("soggetti").select("id, ragione_sociale, codice, partita_iva").eq("id", valore!).maybeSingle()),
  });
  const lista = useQuery({
    queryKey: ["soggetti", "cerca", ruolo ?? "tutti", q],
    enabled: open,
    queryFn: async () => {
      let r = supabase.from("soggetti").select("id, ragione_sociale, codice, partita_iva").eq("attivo", true);
      if (ruolo) r = r.eq(ruolo, true);
      const f = filtroTesto(q, ["ragione_sociale", "codice", "partita_iva"]);
      if (f) r = r.or(f);
      return ok(await r.order("ragione_sociale").limit(30));
    },
  });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" disabled={disabled} className="h-10 w-full justify-between font-normal">
          <span className="truncate">{scelto.data?.ragione_sociale ?? (valore ? "…" : placeholder)}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cerca nome, codice, P.IVA…" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty>{lista.isLoading ? "Ricerca…" : "Nessun risultato"}</CommandEmpty>
            <CommandGroup>
              {(lista.data ?? []).map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.id}
                  onSelect={() => {
                    onChange(s.id, s);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", valore === s.id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{s.ragione_sociale}</span>
                  {s.codice && <span className="ml-auto pl-2 text-xs text-muted-foreground">{s.codice}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type ArticoloBreve = {
  id: string;
  codice: string;
  descrizione: string;
  um: string;
  iva: number;
  gestione_lotti: boolean;
  gestione_scadenze: boolean;
};
const COLONNE_ART = "id, codice, descrizione, um, iva, gestione_lotti, gestione_scadenze";

/** Ricerca di un articolo per codice, descrizione o EAN. */
export function SceltaArticolo({
  onScelto,
  etichetta = "Aggiungi articolo",
  className,
}: {
  onScelto: (a: ArticoloBreve) => void;
  etichetta?: string | undefined;
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const lista = useQuery({
    queryKey: ["articoli", "cerca", q],
    enabled: open,
    queryFn: async () => {
      let r = supabase.from("articoli").select(COLONNE_ART).eq("attivo", true);
      const f = filtroTesto(q, ["codice", "descrizione", "ean"]);
      if (f) r = r.or(f);
      return ok(await r.order("codice").limit(40));
    },
  });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={className}>
          {etichetta}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[28rem] max-w-[95vw] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Codice, descrizione o EAN…" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty>{lista.isLoading ? "Ricerca…" : "Nessun articolo"}</CommandEmpty>
            <CommandGroup>
              {(lista.data ?? []).map((a) => (
                <CommandItem
                  key={a.id}
                  value={a.id}
                  onSelect={() => {
                    onScelto(a);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <span className="w-24 shrink-0 truncate font-mono text-xs">{a.codice}</span>
                  <span className="truncate">{a.descrizione}</span>
                  <span className="ml-auto pl-2 text-xs text-muted-foreground">{a.um}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Elenchi piccoli usati nelle tendine (pagamenti, listini, magazzini). */
export function usePagamenti() {
  return useQuery({
    queryKey: ["pagamenti"],
    queryFn: async () => ok(await supabase.from("pagamenti").select("id, nome, rate, fine_mese, attivo").order("nome")),
  });
}
export function useMagazzini() {
  return useQuery({
    queryKey: ["magazzini"],
    queryFn: async () => ok(await supabase.from("magazzini").select("id, nome, predefinito").order("nome")),
  });
}
export function useListini() {
  return useQuery({
    queryKey: ["listini"],
    queryFn: async () =>
      ok(
        await supabase
          .from("listini")
          .select("id, nome, soggetto_id, predefinito, ricarico, attivo, valido_dal, valido_al, soggetti!listini_soggetto_id_fkey(ragione_sociale)")
          .order("predefinito", { ascending: false })
          .order("nome"),
      ),
  });
}
