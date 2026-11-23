import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Invito di un collega: serve la chiave di servizio di Supabase (Secret SUPABASE_SERVICE_ROLE_KEY su Cloudflare).
 * Chi invita deve avere gestire_utenti; il ruolo titolare lo dà solo un titolare.
 */
export const invitaUtente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        nome: z.string().trim().min(1).max(100),
        cognome: z.string().trim().max(100),
        email: z.string().trim().toLowerCase().email().max(255),
        ruolo: z.enum(["titolare", "ufficio", "magazzino", "agente"]),
        redirectTo: z.string().url().max(500),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const [{ data: ok }, { data: az }, { data: io }] = await Promise.all([
      sb.rpc("ha_permesso", { _p: "gestire_utenti" }),
      sb.rpc("azienda_corrente"),
      sb.from("profili").select("ruolo").eq("id", context.userId).maybeSingle(),
    ]);
    if (ok !== true || !az) throw new Error("Permesso negato");
    if (data.ruolo === "titolare" && io?.ruolo !== "titolare") throw new Error("Solo un titolare nomina un titolare");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const esiste = await supabaseAdmin.from("profili").select("id").eq("email", data.email).limit(1);
    if (esiste.data?.length) throw new Error("Esiste già un utente con questa email");

    const inv = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: data.redirectTo });
    if (inv.error || !inv.data.user) {
      if (/already|registered|exists/i.test(inv.error?.message ?? "")) throw new Error("Esiste già un utente con questa email");
      console.error("invito", inv.error);
      throw new Error("Invio dell'invito non riuscito");
    }
    const uid = inv.data.user.id;
    const p = await supabaseAdmin.from("profili").insert({
      id: uid,
      azienda_id: az,
      nome: data.nome,
      cognome: data.cognome,
      email: data.email,
      ruolo: data.ruolo,
    });
    if (p.error) {
      console.error("profilo invito", p.error);
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error("Creazione dell'utente non riuscita");
    }
    return { id: uid };
  });
