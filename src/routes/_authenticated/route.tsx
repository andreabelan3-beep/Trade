import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { loadSession } from "@/lib/session";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const s = await loadSession();
    if (s.status === "anonimo") throw redirect({ to: "/accesso" });
    if (s.status === "senza_azienda") throw redirect({ to: "/benvenuto" });
    if (s.status !== "ok") {
      await supabase.auth.signOut();
      throw redirect({ to: "/accesso", search: { errore: "disattivato" } });
    }
    return { me: s.me, perms: s.perms };
  },
  component: AppShell,
});
