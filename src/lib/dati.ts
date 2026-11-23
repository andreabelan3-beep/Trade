import { supabase } from "@/integrations/supabase/client";

/** Restituisce i dati o lancia l'errore di Supabase (per React Query). */
export function ok<T>(r: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (r.error) throw r.error;
  return r.data as NonNullable<T>;
}

export { supabase };

/** Cerca testo in più colonne (ilike), con le virgole e le parentesi tolte per non rompere il filtro. */
export const filtroTesto = (q: string, colonne: string[]) => {
  const t = q.trim().replace(/[,()%*]/g, " ").trim();
  return t ? colonne.map((c) => `${c}.ilike.%${t}%`).join(",") : null;
};
