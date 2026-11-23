import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { dimenticaSessione, loadSession } from "@/lib/session";
import { AuthCard } from "@/components/app/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Search = { errore?: "disattivato" | undefined };

export const Route = createFileRoute("/accesso")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    errore: s["errore"] === "disattivato" ? "disattivato" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Accesso — Trade" },
      { name: "description", content: "Accedi a Trade, il gestionale commerciale." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Accesso,
});

const DISATTIVATO = "Il tuo account è disattivato. Contatta il titolare della tua azienda.";

function Accesso() {
  const { errore } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "registrati" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(errore ? DISATTIVATO : null);
  const [info, setInfo] = useState<string | null>(null);

  async function dopoAccesso() {
    dimenticaSessione();
    const s = await loadSession();
    if (s.status === "senza_azienda") return navigate({ to: "/benvenuto", replace: true });
    if (s.status !== "ok") {
      await supabase.auth.signOut();
      setBusy(false);
      setError(DISATTIVATO);
      return;
    }
    navigate({ to: "/cruscotto", replace: true });
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setBusy(false);
      setError(/confirm/i.test(err.message) ? "Conferma prima l'email: ti abbiamo mandato un link." : "Email o password non corretti.");
      return;
    }
    await dopoAccesso();
  }

  async function onRegistrati(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("La password deve avere almeno 8 caratteri.");
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/benvenuto` },
    });
    if (err) {
      setBusy(false);
      setError(/registered|exists/i.test(err.message) ? "Email già registrata: accedi." : "Registrazione non riuscita. Riprova.");
      return;
    }
    if (data.session) return dopoAccesso();
    setBusy(false);
    setInfo("Ti abbiamo mandato un'email: apri il link per confermare e creare la tua azienda.");
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reimposta-password`,
    });
    setBusy(false);
    if (err) setError("Invio non riuscito. Riprova tra qualche minuto.");
    else setInfo("Se l'indirizzo è registrato, riceverai un'email con il link per la nuova password.");
  }

  const campoEmail = (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" autoComplete="email" required value={email}
        onChange={(e) => setEmail(e.target.value)} className="h-12" />
    </div>
  );
  const campoPassword = (
    <div className="space-y-2">
      <Label htmlFor="password">Password</Label>
      <Input id="password" type="password" required value={password}
        autoComplete={mode === "registrati" ? "new-password" : "current-password"}
        onChange={(e) => setPassword(e.target.value)} className="h-12" />
    </div>
  );
  const cambia = (m: typeof mode) => () => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  return (
    <AuthCard
      title={mode === "login" ? "Accedi" : mode === "registrati" ? "Crea un account" : "Password dimenticata"}
      subtitle={mode === "registrati" ? "Poi crei la tua azienda: sarai il titolare." : undefined}
    >
      {info ? (
        <Alert><AlertDescription>{info}</AlertDescription></Alert>
      ) : (
        <form onSubmit={mode === "login" ? onLogin : mode === "registrati" ? onRegistrati : onReset} className="space-y-4">
          {campoEmail}
          {mode !== "reset" && campoPassword}
          {error && (
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          )}
          <Button type="submit" className="h-12 w-full" disabled={busy}>
            {busy ? "Attendi…" : mode === "login" ? "Accedi" : mode === "registrati" ? "Registrati" : "Invia link"}
          </Button>
        </form>
      )}
      <div className="mt-4 flex flex-col gap-2 text-center text-sm text-muted-foreground">
        {mode !== "login" && <button onClick={cambia("login")} className="hover:text-foreground">Torna all'accesso</button>}
        {mode === "login" && <button onClick={cambia("reset")} className="hover:text-foreground">Password dimenticata?</button>}
        {mode === "login" && <button onClick={cambia("registrati")} className="hover:text-foreground">Nuova azienda? Registrati</button>}
      </div>
    </AuthCard>
  );
}
