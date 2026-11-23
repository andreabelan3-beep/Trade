import type { Intestazione } from "@/lib/documento-pdf";
import { supabase } from "@/lib/dati";

/** Dati dell'azienda per l'intestazione dei documenti. */
export async function intestazioneAzienda(): Promise<Intestazione & { noteDdt: string | null }> {
  const { data } = await supabase.from("aziende").select("*").maybeSingle();
  if (!data) return { nome: "", righe: [], noteDdt: null };
  return {
    nome: data.nome,
    righe: [
      [data.indirizzo, [data.cap, data.comune, data.provincia ? `(${data.provincia})` : null].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(" - "),
      [data.partita_iva && `P.IVA ${data.partita_iva}`, data.codice_fiscale && `C.F. ${data.codice_fiscale}`].filter(Boolean).join("  "),
      [data.telefono && `Tel. ${data.telefono}`, data.email, data.pec && `PEC ${data.pec}`].filter(Boolean).join("  "),
    ].filter(Boolean),
    noteDdt: data.note_ddt,
  };
}

export const indirizzoSoggetto = (s: {
  ragione_sociale: string;
  indirizzo?: string | null;
  cap?: string | null;
  comune?: string | null;
  provincia?: string | null;
  partita_iva?: string | null;
  codice_fiscale?: string | null;
}) => [
  s.ragione_sociale,
  s.indirizzo ?? "",
  [s.cap, s.comune, s.provincia ? `(${s.provincia})` : null].filter(Boolean).join(" "),
  [s.partita_iva && `P.IVA ${s.partita_iva}`, s.codice_fiscale && s.codice_fiscale !== s.partita_iva && `C.F. ${s.codice_fiscale}`]
    .filter(Boolean)
    .join("  "),
];
