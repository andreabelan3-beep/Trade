import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo } from "@/components/comuni/Campi";
import { SceltaSoggetto } from "@/components/comuni/Scelte";
import { ok, supabase } from "@/lib/dati";
import { messaggioErrore, traGiorni } from "@/lib/formato";

/** Nuovo ordine (cliente/fornitore) o offerta: si sceglie il soggetto e si apre l'editor. */
export function NuovoDocumento({ tipo, onClose }: { tipo: "ordine_cliente" | "ordine_fornitore" | "offerta"; onClose: () => void }) {
  const navigate = useNavigate();
  const [soggetto, setSoggetto] = useState<string | null>(null);
  const crea = useMutation({
    mutationFn: async () => {
      if (!soggetto) throw new Error("Scegli il " + (tipo === "ordine_fornitore" ? "fornitore" : "cliente"));
      if (tipo === "offerta") {
        return ok(await supabase.from("offerte").insert({ soggetto_id: soggetto, valida_fino: traGiorni(30) }).select("id").single()).id;
      }
      return ok(await supabase.from("ordini").insert({ soggetto_id: soggetto, tipo: tipo === "ordine_cliente" ? "cliente" : "fornitore" }).select("id").single()).id;
    },
    onSuccess: (id) => {
      if (tipo === "offerta") navigate({ to: "/offerte/$id", params: { id } });
      else navigate({ to: "/ordini/$id", params: { id } });
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  });
  const titolo = tipo === "offerta" ? "Nuova offerta" : tipo === "ordine_cliente" ? "Nuovo ordine cliente" : "Nuovo ordine a fornitore";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{titolo}</DialogTitle></DialogHeader>
        <Campo label={tipo === "ordine_fornitore" ? "Fornitore" : "Cliente"}>
          <SceltaSoggetto ruolo={tipo === "ordine_fornitore" ? "fornitore" : "cliente"} valore={soggetto} onChange={(v) => setSoggetto(v)} />
        </Campo>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button onClick={() => crea.mutate()} disabled={!soggetto || crea.isPending}>Crea</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
