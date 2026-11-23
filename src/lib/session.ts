import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Ruolo = Database["public"]["Enums"]["ruolo"];

export const PERMESSI = [
  "vedere_costi",
  "gestire_anagrafiche",
  "gestire_articoli",
  "gestire_listini",
  "gestire_acquisti",
  "gestire_vendite",
  "gestire_magazzino",
  "vedere_scadenzario",
  "vedere_analisi",
  "gestire_utenti",
  "gestire_impostazioni",
] as const;
export type Permesso = (typeof PERMESSI)[number];
export type Permessi = Record<Permesso, boolean>;

export const ETICHETTE_PERMESSI: Record<Permesso, string> = {
  vedere_costi: "Vedere costi e margini",
  gestire_anagrafiche: "Clienti e fornitori",
  gestire_articoli: "Articoli",
  gestire_listini: "Listini",
  gestire_acquisti: "Acquisti (DDT in entrata, ordini fornitori)",
  gestire_vendite: "Vendite (offerte, ordini clienti, DDT in uscita)",
  gestire_magazzino: "Magazzino (rettifiche, evasione)",
  vedere_scadenzario: "Scadenzario e previsionale",
  vedere_analisi: "Analisi economica",
  gestire_utenti: "Utenti e permessi",
  gestire_impostazioni: "Impostazioni azienda",
};

export type Me = {
  id: string;
  nome: string;
  cognome: string;
  email: string | null;
  ruolo: Ruolo;
  aziendaId: string;
  aziendaNome: string;
};

export type SessionResult =
  | { status: "ok"; me: Me; perms: Permessi }
  | { status: "anonimo" }
  | { status: "disattivato" }
  | { status: "senza_azienda"; email: string | null };

let memoria: { userId: string; quando: number; r: SessionResult } | null = null;

export function dimenticaSessione() {
  memoria = null;
}

/** Profilo e permessi dell'utente collegato (RLS + ha_permesso), tenuti in memoria per un minuto. */
export async function loadSession(): Promise<SessionResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    memoria = null;
    return { status: "anonimo" };
  }
  const uid = session.user.id;
  if (memoria && memoria.userId === uid && Date.now() - memoria.quando < 60_000) return memoria.r;

  const { data: p, error } = await supabase
    .from("profili")
    .select("id, nome, cognome, email, ruolo, attivo, azienda_id")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;
  let r: SessionResult;
  if (!p) r = { status: "senza_azienda", email: session.user.email ?? null };
  else if (!p.attivo) r = { status: "disattivato" };
  else {
    const [az, ...checks] = await Promise.all([
      supabase.from("aziende").select("nome").eq("id", p.azienda_id).maybeSingle(),
      ...PERMESSI.map((x) => supabase.rpc("ha_permesso", { _p: x })),
    ]);
    const perms = Object.fromEntries(PERMESSI.map((x, i) => [x, checks[i]?.data === true])) as Permessi;
    r = {
      status: "ok",
      perms,
      me: {
        id: p.id,
        nome: p.nome,
        cognome: p.cognome,
        email: p.email,
        ruolo: p.ruolo,
        aziendaId: p.azienda_id,
        aziendaNome: az.data?.nome ?? "",
      },
    };
  }
  memoria = { userId: uid, quando: Date.now(), r };
  return r;
}

export const ETICHETTE_RUOLI: Record<Ruolo, string> = {
  titolare: "Titolare",
  ufficio: "Ufficio",
  magazzino: "Magazzino",
  agente: "Agente",
};
