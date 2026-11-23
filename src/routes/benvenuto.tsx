import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { dimenticaSessione, loadSession } from "@/lib/session";
import { AuthCard } from "@/components/app/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { messaggioErrore } from "@/lib/formato";

export const Route = createFileRoute("/benvenuto")({
  ssr: false,
  head: () => ({ meta: [{ title: "Crea la tua azienda — Trade" }, { name: "robots", content: "noindex" }] }),
  component: Benvenuto,
});

function Benvenuto() {
  const navigate = useNavigate();
  const [stato, setStato] = useState<"attesa" | "pronto">("attesa");
  const [azienda, setAzienda] = useState("");
  const [piva, setPiva] = useState("");
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Il link di conferma email apre questa pagina già collegato.
    const verifica = async () => {
      const s = await loadSession();
      if (s.status === "ok") navigate({ to: "/cruscotto", replace: true });
      else if (s.status === "anonimo") return;
      else if (s.status === "senza_azienda") setStato("pronto");
      else navigate({ to: "/accesso", replace: true });
    };
    const { data } = supabase.auth.onAuthStateChange(() => void verifica());
    void verifica();
    const t = setTimeout(async () => {
      const s = await loadSession();
      if (s.status === "anonimo") navigate({ to: "/accesso", replace: true });
    }, 4000);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.rpc("crea_azienda", {
      _nome: azienda,
      _partita_iva: piva,
      _nome_utente: nome,
      _cognome: cognome,
    });
    if (err) {
      setBusy(false);
      setError(messaggioErrore(err));
      return;
    }
    dimenticaSessione();
    navigate({ to: "/cruscotto", replace: true });
  }

  return (
    <AuthCard title="Crea la tua azienda" subtitle="Sarai il titolare: poi potrai invitare i colleghi.">
      {stato === "attesa" ? (
        <p className="text-sm text-muted-foreground">Verifica in corso…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="az">Ragione sociale</Label>
            <Input id="az" required value={azienda} onChange={(e) => setAzienda(e.target.value)} className="h-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="piva">Partita IVA</Label>
            <Input id="piva" value={piva} onChange={(e) => setPiva(e.target.value)} className="h-12" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nome">Il tuo nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cognome">Cognome</Label>
              <Input id="cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} className="h-12" />
            </div>
          </div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <Button type="submit" className="h-12 w-full" disabled={busy}>
            {busy ? "Creazione…" : "Crea azienda"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
