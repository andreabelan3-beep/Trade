import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ok, supabase } from "@/lib/dati";
import { messaggioErrore } from "@/lib/formato";

type Search = { direzione?: "uscita" | "entrata" };

export const Route = createFileRoute("/_authenticated/ddt/nuovo")({
  validateSearch: (s: Record<string, unknown>): Search => ({ direzione: s["direzione"] === "entrata" ? "entrata" : "uscita" }),
  component: NuovoDdt,
});

/** Crea subito la bozza e apre l'editor. */
function NuovoDdt() {
  const { direzione = "uscita" } = Route.useSearch();
  const navigate = useNavigate();
  const fatto = useRef(false);
  useEffect(() => {
    if (fatto.current) return;
    fatto.current = true;
    (async () => {
      try {
        const mag = ok(await supabase.from("magazzini").select("id").eq("predefinito", true).maybeSingle());
        const d = ok(
          await supabase
            .from("ddt")
            .insert({ direzione, causale: direzione === "uscita" ? "vendita" : "acquisto", magazzino_id: mag?.id ?? null,
              aspetto_beni: direzione === "uscita" ? "A vista" : null, porto: direzione === "uscita" ? "Franco" : null })
            .select("id")
            .single(),
        );
        navigate({ to: "/ddt/$id", params: { id: d.id }, replace: true });
      } catch (e) {
        toast.error(messaggioErrore(e));
        navigate({ to: "/ddt", search: { direzione }, replace: true });
      }
    })();
  }, [direzione, navigate]);
  return <p className="p-8 text-muted-foreground">Creazione del DDT…</p>;
}
