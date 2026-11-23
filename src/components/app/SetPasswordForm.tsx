import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { loadSession } from "@/lib/session";
import { AuthCard } from "./AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Used by both the invite link and the password-reset link: the link signs the user in, then they choose a password. */
export function SetPasswordForm({ title, subtitle }: { title: string; subtitle: string }) {
  const navigate = useNavigate();
  const [state, setState] = useState<"attesa" | "pronto" | "scaduto">("attesa");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash.includes("error")) {
      setState("scaduto");
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setState("pronto");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setState("pronto");
    });
    const t = setTimeout(() => setState((s) => (s === "attesa" ? "scaduto" : s)), 4000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("La password deve avere almeno 8 caratteri.");
    if (password !== confirm) return setError("Le due password non coincidono.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setBusy(false);
      setError(
        /different|same/i.test(err.message)
          ? "La nuova password deve essere diversa da quella attuale."
          : "Salvataggio non riuscito. Riprova.",
      );
      return;
    }
    const s = await loadSession();
    if (s.status === "senza_azienda") {
      navigate({ to: "/benvenuto", replace: true });
      return;
    }
    if (s.status !== "ok") {
      await supabase.auth.signOut();
      navigate({ to: "/accesso", search: { errore: "disattivato" }, replace: true });
      return;
    }
    navigate({ to: "/cruscotto", replace: true });
  }

  if (state === "scaduto") {
    return (
      <AuthCard title={title}>
        <Alert variant="destructive">
          <AlertDescription>
            Il link non è valido o è scaduto. Chiedi un nuovo invito o usa "Password dimenticata".
          </AlertDescription>
        </Alert>
        <Link
          to="/accesso"
          className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Vai all'accesso
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={title} subtitle={subtitle}>
      {state === "attesa" ? (
        <p className="text-sm text-muted-foreground">Verifica del link in corso…</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw">Nuova password</Label>
            <Input
              id="pw"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw2">Ripeti la password</Label>
            <Input
              id="pw2"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-12 w-full" disabled={busy}>
            {busy ? "Salvataggio…" : "Salva e accedi"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
