// Generato dal database Trade (Supabase zakosqwxfjhnsrcywcjr); azienda_id reso facoltativo negli Insert (lo imposta il database).
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      articoli: {
        Row: {
          aggiornato_il: string
          attivo: boolean
          azienda_id: string
          categoria_id: string | null
          codice: string
          creato_il: string
          descrizione: string
          ean: string | null
          fornitore_id: string | null
          gestione_lotti: boolean
          gestione_scadenze: boolean
          id: string
          iva: number
          marca: string | null
          note: string | null
          ricarico: number | null
          scorta_minima: number
          um: string
        }
        Insert: {
          aggiornato_il?: string
          attivo?: boolean
          azienda_id?: string
          categoria_id?: string | null
          codice: string
          creato_il?: string
          descrizione: string
          ean?: string | null
          fornitore_id?: string | null
          gestione_lotti?: boolean
          gestione_scadenze?: boolean
          id?: string
          iva?: number
          marca?: string | null
          note?: string | null
          ricarico?: number | null
          scorta_minima?: number
          um?: string
        }
        Update: {
          aggiornato_il?: string
          attivo?: boolean
          azienda_id?: string
          categoria_id?: string | null
          codice?: string
          creato_il?: string
          descrizione?: string
          ean?: string | null
          fornitore_id?: string | null
          gestione_lotti?: boolean
          gestione_scadenze?: boolean
          id?: string
          iva?: number
          marca?: string | null
          note?: string | null
          ricarico?: number | null
          scorta_minima?: number
          um?: string
        }
        Relationships: [
          {
            foreignKeyName: "articoli_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articoli_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articoli_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "soggetti"
            referencedColumns: ["id"]
          },
        ]
      }
      articoli_costi: {
        Row: {
          aggiornato_il: string
          articolo_id: string
          azienda_id: string
          costo_ultimo: number
        }
        Insert: {
          aggiornato_il?: string
          articolo_id: string
          azienda_id?: string
          costo_ultimo?: number
        }
        Update: {
          aggiornato_il?: string
          articolo_id?: string
          azienda_id?: string
          costo_ultimo?: number
        }
        Relationships: [
          {
            foreignKeyName: "articoli_costi_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: true
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articoli_costi_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: true
            referencedRelation: "giacenze_articoli"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "articoli_costi_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
        ]
      }
      aziende: {
        Row: {
          cap: string | null
          codice_fiscale: string | null
          comune: string | null
          creata_il: string
          email: string | null
          giacenza_negativa: boolean
          giorni_avviso_scadenze: number
          id: string
          indirizzo: string | null
          iva_predefinita: number
          nome: string
          note_ddt: string | null
          partita_iva: string | null
          pec: string | null
          provincia: string | null
          telefono: string | null
        }
        Insert: {
          cap?: string | null
          codice_fiscale?: string | null
          comune?: string | null
          creata_il?: string
          email?: string | null
          giacenza_negativa?: boolean
          giorni_avviso_scadenze?: number
          id?: string
          indirizzo?: string | null
          iva_predefinita?: number
          nome: string
          note_ddt?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          telefono?: string | null
        }
        Update: {
          cap?: string | null
          codice_fiscale?: string | null
          comune?: string | null
          creata_il?: string
          email?: string | null
          giacenza_negativa?: boolean
          giorni_avviso_scadenze?: number
          id?: string
          indirizzo?: string | null
          iva_predefinita?: number
          nome?: string
          note_ddt?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      categorie: {
        Row: {
          azienda_id: string
          id: string
          nome: string
          parent_id: string | null
          ricarico: number | null
        }
        Insert: {
          azienda_id?: string
          id?: string
          nome: string
          parent_id?: string | null
          ricarico?: number | null
        }
        Update: {
          azienda_id?: string
          id?: string
          nome?: string
          parent_id?: string | null
          ricarico?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categorie_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorie_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categorie"
            referencedColumns: ["id"]
          },
        ]
      }
      codici_fornitore: {
        Row: {
          aggiornato_il: string
          articolo_id: string
          azienda_id: string
          codice: string
          descrizione: string | null
          fornitore_id: string
          id: string
          ultimo_prezzo: number | null
        }
        Insert: {
          aggiornato_il?: string
          articolo_id: string
          azienda_id?: string
          codice: string
          descrizione?: string | null
          fornitore_id: string
          id?: string
          ultimo_prezzo?: number | null
        }
        Update: {
          aggiornato_il?: string
          articolo_id?: string
          azienda_id?: string
          codice?: string
          descrizione?: string | null
          fornitore_id?: string
          id?: string
          ultimo_prezzo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "codici_fornitore_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codici_fornitore_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "giacenze_articoli"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "codici_fornitore_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codici_fornitore_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "soggetti"
            referencedColumns: ["id"]
          },
        ]
      }
      contatori: {
        Row: {
          anno: number
          azienda_id: string
          tipo: string
          ultimo: number
        }
        Insert: {
          anno: number
          azienda_id?: string
          tipo: string
          ultimo?: number
        }
        Update: {
          anno?: number
          azienda_id?: string
          tipo?: string
          ultimo?: number
        }
        Relationships: [
          {
            foreignKeyName: "contatori_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
        ]
      }
      ddt: {
        Row: {
          aggiornato_il: string
          anno: number | null
          aspetto_beni: string | null
          azienda_id: string
          causale: string
          colli: number | null
          confermato_da: string | null
          confermato_il: string | null
          creato_da: string | null
          creato_il: string
          danea_esportato_il: string | null
          data: string
          destinazione_id: string | null
          direzione: string
          file_path: string | null
          id: string
          inizio_trasporto: string | null
          lettura_ia: Json | null
          magazzino_id: string | null
          note: string | null
          note_interne: string | null
          numero: string | null
          numero_int: number | null
          pagamento_id: string | null
          peso: number | null
          porto: string | null
          soggetto_id: string | null
          stato: string
          trasporto_cura: string
          vettore: string | null
        }
        Insert: {
          aggiornato_il?: string
          anno?: number | null
          aspetto_beni?: string | null
          azienda_id?: string
          causale: string
          colli?: number | null
          confermato_da?: string | null
          confermato_il?: string | null
          creato_da?: string | null
          creato_il?: string
          danea_esportato_il?: string | null
          data?: string
          destinazione_id?: string | null
          direzione: string
          file_path?: string | null
          id?: string
          inizio_trasporto?: string | null
          lettura_ia?: Json | null
          magazzino_id?: string | null
          note?: string | null
          note_interne?: string | null
          numero?: string | null
          numero_int?: number | null
          pagamento_id?: string | null
          peso?: number | null
          porto?: string | null
          soggetto_id?: string | null
          stato?: string
          trasporto_cura?: string
          vettore?: string | null
        }
        Update: {
          aggiornato_il?: string
          anno?: number | null
          aspetto_beni?: string | null
          azienda_id?: string
          causale?: string
          colli?: number | null
          confermato_da?: string | null
          confermato_il?: string | null
          creato_da?: string | null
          creato_il?: string
          danea_esportato_il?: string | null
          data?: string
          destinazione_id?: string | null
          direzione?: string
          file_path?: string | null
          id?: string
          inizio_trasporto?: string | null
          lettura_ia?: Json | null
          magazzino_id?: string | null
          note?: string | null
          note_interne?: string | null
          numero?: string | null
          numero_int?: number | null
          pagamento_id?: string | null
          peso?: number | null
          porto?: string | null
          soggetto_id?: string | null
          stato?: string
          trasporto_cura?: string
          vettore?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ddt_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_destinazione_id_fkey"
            columns: ["destinazione_id"]
            isOneToOne: false
            referencedRelation: "destinazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_soggetto_id_fkey"
            columns: ["soggetto_id"]
            isOneToOne: false
            referencedRelation: "soggetti"
            referencedColumns: ["id"]
          },
        ]
      }
      ddt_righe: {
        Row: {
          articolo_id: string | null
          azienda_id: string
          codice: string | null
          ddt_id: string
          descrizione: string
          id: string
          iva: number
          lotto: string | null
          ordine_riga_id: string | null
          posizione: number
          prezzo: number
          qta: number
          scadenza: string | null
          sconto: number
          um: string
        }
        Insert: {
          articolo_id?: string | null
          azienda_id?: string
          codice?: string | null
          ddt_id: string
          descrizione?: string
          id?: string
          iva?: number
          lotto?: string | null
          ordine_riga_id?: string | null
          posizione?: number
          prezzo?: number
          qta?: number
          scadenza?: string | null
          sconto?: number
          um?: string
        }
        Update: {
          articolo_id?: string | null
          azienda_id?: string
          codice?: string | null
          ddt_id?: string
          descrizione?: string
          id?: string
          iva?: number
          lotto?: string | null
          ordine_riga_id?: string | null
          posizione?: number
          prezzo?: number
          qta?: number
          scadenza?: string | null
          sconto?: number
          um?: string
        }
        Relationships: [
          {
            foreignKeyName: "ddt_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "giacenze_articoli"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "ddt_righe_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_righe_ddt_id_fkey"
            columns: ["ddt_id"]
            isOneToOne: false
            referencedRelation: "ddt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_righe_ddt_id_fkey"
            columns: ["ddt_id"]
            isOneToOne: false
            referencedRelation: "ddt_elenco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_righe_ordine_riga_id_fkey"
            columns: ["ordine_riga_id"]
            isOneToOne: false
            referencedRelation: "ordini_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_righe_ordine_riga_id_fkey"
            columns: ["ordine_riga_id"]
            isOneToOne: false
            referencedRelation: "ordini_righe_evasione"
            referencedColumns: ["id"]
          },
        ]
      }
      destinazioni: {
        Row: {
          azienda_id: string
          cap: string | null
          comune: string | null
          id: string
          indirizzo: string | null
          nome: string
          predefinita: boolean
          provincia: string | null
          soggetto_id: string
        }
        Insert: {
          azienda_id?: string
          cap?: string | null
          comune?: string | null
          id?: string
          indirizzo?: string | null
          nome: string
          predefinita?: boolean
          provincia?: string | null
          soggetto_id: string
        }
        Update: {
          azienda_id?: string
          cap?: string | null
          comune?: string | null
          id?: string
          indirizzo?: string | null
          nome?: string
          predefinita?: boolean
          provincia?: string | null
          soggetto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "destinazioni_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destinazioni_soggetto_id_fkey"
            columns: ["soggetto_id"]
            isOneToOne: false
            referencedRelation: "soggetti"
            referencedColumns: ["id"]
          },
        ]
      }
      listini: {
        Row: {
          attivo: boolean
          azienda_id: string
          creato_il: string
          id: string
          nome: string
          note: string | null
          predefinito: boolean
          ricarico: number | null
          soggetto_id: string | null
          valido_al: string | null
          valido_dal: string | null
        }
        Insert: {
          attivo?: boolean
          azienda_id?: string
          creato_il?: string
          id?: string
          nome: string
          note?: string | null
          predefinito?: boolean
          ricarico?: number | null
          soggetto_id?: string | null
          valido_al?: string | null
          valido_dal?: string | null
        }
        Update: {
          attivo?: boolean
          azienda_id?: string
          creato_il?: string
          id?: string
          nome?: string
          note?: string | null
          predefinito?: boolean
          ricarico?: number | null
          soggetto_id?: string | null
          valido_al?: string | null
          valido_dal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listini_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listini_soggetto_id_fkey"
            columns: ["soggetto_id"]
            isOneToOne: false
            referencedRelation: "soggetti"
            referencedColumns: ["id"]
          },
        ]
      }
      listini_prezzi: {
        Row: {
          aggiornato_il: string
          articolo_id: string
          azienda_id: string
          id: string
          listino_id: string
          prezzo: number
          qta_minima: number
          sconto: number
        }
        Insert: {
          aggiornato_il?: string
          articolo_id: string
          azienda_id?: string
          id?: string
          listino_id: string
          prezzo: number
          qta_minima?: number
          sconto?: number
        }
        Update: {
          aggiornato_il?: string
          articolo_id?: string
          azienda_id?: string
          id?: string
          listino_id?: string
          prezzo?: number
          qta_minima?: number
          sconto?: number
        }
        Relationships: [
          {
            foreignKeyName: "listini_prezzi_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listini_prezzi_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "giacenze_articoli"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "listini_prezzi_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listini_prezzi_listino_id_fkey"
            columns: ["listino_id"]
            isOneToOne: false
            referencedRelation: "listini"
            referencedColumns: ["id"]
          },
        ]
      }
      lotti: {
        Row: {
          articolo_id: string
          azienda_id: string
          codice: string
          creato_il: string
          id: string
          scadenza: string | null
        }
        Insert: {
          articolo_id: string
          azienda_id?: string
          codice: string
          creato_il?: string
          id?: string
          scadenza?: string | null
        }
        Update: {
          articolo_id?: string
          azienda_id?: string
          codice?: string
          creato_il?: string
          id?: string
          scadenza?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "giacenze_articoli"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "lotti_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
        ]
      }
      magazzini: {
        Row: {
          azienda_id: string
          id: string
          nome: string
          predefinito: boolean
        }
        Insert: {
          azienda_id?: string
          id?: string
          nome: string
          predefinito?: boolean
        }
        Update: {
          azienda_id?: string
          id?: string
          nome?: string
          predefinito?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "magazzini_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
        ]
      }
      movimenti: {
        Row: {
          articolo_id: string
          azienda_id: string
          causale: string
          creato_da: string | null
          creato_il: string
          data: string
          ddt_riga_id: string | null
          id: string
          lotto_id: string | null
          magazzino_id: string
          nota: string | null
          qta: number
        }
        Insert: {
          articolo_id: string
          azienda_id?: string
          causale: string
          creato_da?: string | null
          creato_il?: string
          data?: string
          ddt_riga_id?: string | null
          id?: string
          lotto_id?: string | null
          magazzino_id: string
          nota?: string | null
          qta: number
        }
        Update: {
          articolo_id?: string
          azienda_id?: string
          causale?: string
          creato_da?: string | null
          creato_il?: string
          data?: string
          ddt_riga_id?: string | null
          id?: string
          lotto_id?: string | null
          magazzino_id?: string
          nota?: string | null
          qta?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimenti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "giacenze_articoli"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "movimenti_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_ddt_riga_fk"
            columns: ["ddt_riga_id"]
            isOneToOne: false
            referencedRelation: "ddt_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "lotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "lotti_giacenza"
            referencedColumns: ["lotto_id"]
          },
          {
            foreignKeyName: "movimenti_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzini"
            referencedColumns: ["id"]
          },
        ]
      }
      movimenti_costi: {
        Row: {
          azienda_id: string
          costo_unitario: number
          movimento_id: string
        }
        Insert: {
          azienda_id?: string
          costo_unitario?: number
          movimento_id: string
        }
        Update: {
          azienda_id?: string
          costo_unitario?: number
          movimento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimenti_costi_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_costi_movimento_id_fkey"
            columns: ["movimento_id"]
            isOneToOne: true
            referencedRelation: "movimenti"
            referencedColumns: ["id"]
          },
        ]
      }
      offerte: {
        Row: {
          aggiornato_il: string
          anno: number | null
          azienda_id: string
          creato_da: string | null
          creato_il: string
          data: string
          id: string
          note: string | null
          note_interne: string | null
          numero: string | null
          numero_int: number | null
          oggetto: string | null
          ordine_id: string | null
          pagamento_id: string | null
          soggetto_id: string
          stato: string
          valida_fino: string | null
        }
        Insert: {
          aggiornato_il?: string
          anno?: number | null
          azienda_id?: string
          creato_da?: string | null
          creato_il?: string
          data?: string
          id?: string
          note?: string | null
          note_interne?: string | null
          numero?: string | null
          numero_int?: number | null
          oggetto?: string | null
          ordine_id?: string | null
          pagamento_id?: string | null
          soggetto_id: string
          stato?: string
          valida_fino?: string | null
        }
        Update: {
          aggiornato_il?: string
          anno?: number | null
          azienda_id?: string
          creato_da?: string | null
          creato_il?: string
          data?: string
          id?: string
          note?: string | null
          note_interne?: string | null
          numero?: string | null
          numero_int?: number | null
          oggetto?: string | null
          ordine_id?: string | null
          pagamento_id?: string | null
          soggetto_id?: string
          stato?: string
          valida_fino?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offerte_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_ordine_fk"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_ordine_fk"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini_elenco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_soggetto_id_fkey"
            columns: ["soggetto_id"]
            isOneToOne: false
            referencedRelation: "soggetti"
            referencedColumns: ["id"]
          },
        ]
      }
      offerte_righe: {
        Row: {
          articolo_id: string | null
          azienda_id: string
          codice: string | null
          descrizione: string
          id: string
          iva: number
          offerta_id: string
          posizione: number
          prezzo: number
          qta: number
          sconto: number
          um: string
        }
        Insert: {
          articolo_id?: string | null
          azienda_id?: string
          codice?: string | null
          descrizione?: string
          id?: string
          iva?: number
          offerta_id: string
          posizione?: number
          prezzo?: number
          qta?: number
          sconto?: number
          um?: string
        }
        Update: {
          articolo_id?: string | null
          azienda_id?: string
          codice?: string | null
          descrizione?: string
          id?: string
          iva?: number
          offerta_id?: string
          posizione?: number
          prezzo?: number
          qta?: number
          sconto?: number
          um?: string
        }
        Relationships: [
          {
            foreignKeyName: "offerte_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "giacenze_articoli"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "offerte_righe_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_righe_offerta_id_fkey"
            columns: ["offerta_id"]
            isOneToOne: false
            referencedRelation: "offerte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_righe_offerta_id_fkey"
            columns: ["offerta_id"]
            isOneToOne: false
            referencedRelation: "offerte_elenco"
            referencedColumns: ["id"]
          },
        ]
      }
      ordini: {
        Row: {
          aggiornato_il: string
          anno: number | null
          azienda_id: string
          creato_da: string | null
          creato_il: string
          data: string
          data_consegna: string | null
          destinazione_id: string | null
          id: string
          note: string | null
          note_interne: string | null
          numero: string | null
          numero_int: number | null
          offerta_id: string | null
          pagamento_id: string | null
          riferimento: string | null
          soggetto_id: string
          stato: string
          tipo: string
        }
        Insert: {
          aggiornato_il?: string
          anno?: number | null
          azienda_id?: string
          creato_da?: string | null
          creato_il?: string
          data?: string
          data_consegna?: string | null
          destinazione_id?: string | null
          id?: string
          note?: string | null
          note_interne?: string | null
          numero?: string | null
          numero_int?: number | null
          offerta_id?: string | null
          pagamento_id?: string | null
          riferimento?: string | null
          soggetto_id: string
          stato?: string
          tipo: string
        }
        Update: {
          aggiornato_il?: string
          anno?: number | null
          azienda_id?: string
          creato_da?: string | null
          creato_il?: string
          data?: string
          data_consegna?: string | null
          destinazione_id?: string | null
          id?: string
          note?: string | null
          note_interne?: string | null
          numero?: string | null
          numero_int?: number | null
          offerta_id?: string | null
          pagamento_id?: string | null
          riferimento?: string | null
          soggetto_id?: string
          stato?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordini_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_destinazione_id_fkey"
            columns: ["destinazione_id"]
            isOneToOne: false
            referencedRelation: "destinazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_offerta_id_fkey"
            columns: ["offerta_id"]
            isOneToOne: false
            referencedRelation: "offerte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_offerta_id_fkey"
            columns: ["offerta_id"]
            isOneToOne: false
            referencedRelation: "offerte_elenco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_soggetto_id_fkey"
            columns: ["soggetto_id"]
            isOneToOne: false
            referencedRelation: "soggetti"
            referencedColumns: ["id"]
          },
        ]
      }
      ordini_righe: {
        Row: {
          articolo_id: string | null
          azienda_id: string
          chiusa: boolean
          codice: string | null
          data_consegna: string | null
          descrizione: string
          id: string
          iva: number
          ordine_id: string
          posizione: number
          prezzo: number
          qta: number
          sconto: number
          um: string
        }
        Insert: {
          articolo_id?: string | null
          azienda_id?: string
          chiusa?: boolean
          codice?: string | null
          data_consegna?: string | null
          descrizione?: string
          id?: string
          iva?: number
          ordine_id: string
          posizione?: number
          prezzo?: number
          qta?: number
          sconto?: number
          um?: string
        }
        Update: {
          articolo_id?: string | null
          azienda_id?: string
          chiusa?: boolean
          codice?: string | null
          data_consegna?: string | null
          descrizione?: string
          id?: string
          iva?: number
          ordine_id?: string
          posizione?: number
          prezzo?: number
          qta?: number
          sconto?: number
          um?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordini_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "giacenze_articoli"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "ordini_righe_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_righe_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_righe_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini_elenco"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamenti: {
        Row: {
          attivo: boolean
          azienda_id: string
          creato_il: string
          fine_mese: boolean
          id: string
          nome: string
          rate: Json
        }
        Insert: {
          attivo?: boolean
          azienda_id?: string
          creato_il?: string
          fine_mese?: boolean
          id?: string
          nome: string
          rate?: Json
        }
        Update: {
          attivo?: boolean
          azienda_id?: string
          creato_il?: string
          fine_mese?: boolean
          id?: string
          nome?: string
          rate?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pagamenti_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
        ]
      }
      permessi_ruolo: {
        Row: {
          azienda_id: string
          permesso: string
          ruolo: Database["public"]["Enums"]["ruolo"]
        }
        Insert: {
          azienda_id?: string
          permesso: string
          ruolo: Database["public"]["Enums"]["ruolo"]
        }
        Update: {
          azienda_id?: string
          permesso?: string
          ruolo?: Database["public"]["Enums"]["ruolo"]
        }
        Relationships: [
          {
            foreignKeyName: "permessi_ruolo_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
        ]
      }
      profili: {
        Row: {
          attivo: boolean
          azienda_id: string
          cognome: string
          creato_il: string
          email: string | null
          id: string
          nome: string
          ruolo: Database["public"]["Enums"]["ruolo"]
        }
        Insert: {
          attivo?: boolean
          azienda_id?: string
          cognome?: string
          creato_il?: string
          email?: string | null
          id: string
          nome?: string
          ruolo?: Database["public"]["Enums"]["ruolo"]
        }
        Update: {
          attivo?: boolean
          azienda_id?: string
          cognome?: string
          creato_il?: string
          email?: string | null
          id?: string
          nome?: string
          ruolo?: Database["public"]["Enums"]["ruolo"]
        }
        Relationships: [
          {
            foreignKeyName: "profili_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
        ]
      }
      scadenze: {
        Row: {
          azienda_id: string
          creato_il: string
          data: string
          ddt_id: string | null
          descrizione: string
          id: string
          importo: number
          note: string | null
          origine: string
          ripeti_fino: string | null
          ripeti_mesi: number | null
          saldata_il: string | null
          soggetto_id: string | null
          stato: string
          tipo: string
        }
        Insert: {
          azienda_id?: string
          creato_il?: string
          data: string
          ddt_id?: string | null
          descrizione?: string
          id?: string
          importo: number
          note?: string | null
          origine?: string
          ripeti_fino?: string | null
          ripeti_mesi?: number | null
          saldata_il?: string | null
          soggetto_id?: string | null
          stato?: string
          tipo: string
        }
        Update: {
          azienda_id?: string
          creato_il?: string
          data?: string
          ddt_id?: string | null
          descrizione?: string
          id?: string
          importo?: number
          note?: string | null
          origine?: string
          ripeti_fino?: string | null
          ripeti_mesi?: number | null
          saldata_il?: string | null
          soggetto_id?: string | null
          stato?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "scadenze_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scadenze_ddt_id_fkey"
            columns: ["ddt_id"]
            isOneToOne: false
            referencedRelation: "ddt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scadenze_ddt_id_fkey"
            columns: ["ddt_id"]
            isOneToOne: false
            referencedRelation: "ddt_elenco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scadenze_soggetto_id_fkey"
            columns: ["soggetto_id"]
            isOneToOne: false
            referencedRelation: "soggetti"
            referencedColumns: ["id"]
          },
        ]
      }
      soggetti: {
        Row: {
          agente_id: string | null
          aggiornato_il: string
          attivo: boolean
          azienda_id: string
          cap: string | null
          cliente: boolean
          codice: string | null
          codice_fiscale: string | null
          codice_sdi: string | null
          comune: string | null
          creato_il: string
          email: string | null
          fido: number | null
          fornitore: boolean
          id: string
          indirizzo: string | null
          listino_id: string | null
          nazione: string
          note: string | null
          pagamento_id: string | null
          partita_iva: string | null
          pec: string | null
          provincia: string | null
          ragione_sociale: string
          sconto: number
          telefono: string | null
        }
        Insert: {
          agente_id?: string | null
          aggiornato_il?: string
          attivo?: boolean
          azienda_id?: string
          cap?: string | null
          cliente?: boolean
          codice?: string | null
          codice_fiscale?: string | null
          codice_sdi?: string | null
          comune?: string | null
          creato_il?: string
          email?: string | null
          fido?: number | null
          fornitore?: boolean
          id?: string
          indirizzo?: string | null
          listino_id?: string | null
          nazione?: string
          note?: string | null
          pagamento_id?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          ragione_sociale: string
          sconto?: number
          telefono?: string | null
        }
        Update: {
          agente_id?: string | null
          aggiornato_il?: string
          attivo?: boolean
          azienda_id?: string
          cap?: string | null
          cliente?: boolean
          codice?: string | null
          codice_fiscale?: string | null
          codice_sdi?: string | null
          comune?: string | null
          creato_il?: string
          email?: string | null
          fido?: number | null
          fornitore?: boolean
          id?: string
          indirizzo?: string | null
          listino_id?: string | null
          nazione?: string
          note?: string | null
          pagamento_id?: string | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          ragione_sociale?: string
          sconto?: number
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soggetti_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soggetti_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soggetti_listino_fk"
            columns: ["listino_id"]
            isOneToOne: false
            referencedRelation: "listini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soggetti_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamenti"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ddt_elenco: {
        Row: {
          aggiornato_il: string | null
          anno: number | null
          aspetto_beni: string | null
          azienda_id: string | null
          causale: string | null
          colli: number | null
          confermato_da: string | null
          confermato_il: string | null
          creato_da: string | null
          creato_il: string | null
          danea_esportato_il: string | null
          data: string | null
          destinazione_id: string | null
          direzione: string | null
          file_path: string | null
          id: string | null
          imponibile: number | null
          inizio_trasporto: string | null
          lettura_ia: Json | null
          magazzino_id: string | null
          note: string | null
          note_interne: string | null
          numero: string | null
          numero_int: number | null
          pagamento_id: string | null
          peso: number | null
          porto: string | null
          ragione_sociale: string | null
          righe: number | null
          soggetto_id: string | null
          stato: string | null
          trasporto_cura: string | null
          vettore: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ddt_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_destinazione_id_fkey"
            columns: ["destinazione_id"]
            isOneToOne: false
            referencedRelation: "destinazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ddt_soggetto_id_fkey"
            columns: ["soggetto_id"]
            isOneToOne: false
            referencedRelation: "soggetti"
            referencedColumns: ["id"]
          },
        ]
      }
      ddt_righe_lotti: {
        Row: {
          ddt_riga_id: string | null
          lotto: string | null
          lotto_id: string | null
          qta: number | null
          scadenza: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimenti_ddt_riga_fk"
            columns: ["ddt_riga_id"]
            isOneToOne: false
            referencedRelation: "ddt_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "lotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "lotti_giacenza"
            referencedColumns: ["lotto_id"]
          },
        ]
      }
      giacenze: {
        Row: {
          articolo_id: string | null
          azienda_id: string | null
          lotto_id: string | null
          magazzino_id: string | null
          qta: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimenti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "giacenze_articoli"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "movimenti_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "lotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "lotti_giacenza"
            referencedColumns: ["lotto_id"]
          },
          {
            foreignKeyName: "movimenti_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzini"
            referencedColumns: ["id"]
          },
        ]
      }
      giacenze_articoli: {
        Row: {
          articolo_id: string | null
          azienda_id: string | null
          categoria_id: string | null
          codice: string | null
          descrizione: string | null
          prima_scadenza: string | null
          qta: number | null
          scorta_minima: number | null
          um: string | null
        }
        Insert: {
          articolo_id?: string | null
          azienda_id?: string | null
          categoria_id?: string | null
          codice?: string | null
          descrizione?: string | null
          prima_scadenza?: never
          qta?: never
          scorta_minima?: number | null
          um?: string | null
        }
        Update: {
          articolo_id?: string | null
          azienda_id?: string | null
          categoria_id?: string | null
          codice?: string | null
          descrizione?: string | null
          prima_scadenza?: never
          qta?: never
          scorta_minima?: number | null
          um?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articoli_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articoli_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorie"
            referencedColumns: ["id"]
          },
        ]
      }
      lotti_giacenza: {
        Row: {
          articolo_codice: string | null
          articolo_descrizione: string | null
          articolo_id: string | null
          azienda_id: string | null
          codice: string | null
          lotto_id: string | null
          magazzino_id: string | null
          qta: number | null
          scadenza: string | null
          um: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "giacenze_articoli"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "lotti_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzini"
            referencedColumns: ["id"]
          },
        ]
      }
      offerte_elenco: {
        Row: {
          aggiornato_il: string | null
          anno: number | null
          azienda_id: string | null
          creato_da: string | null
          creato_il: string | null
          data: string | null
          id: string | null
          imponibile: number | null
          note: string | null
          note_interne: string | null
          numero: string | null
          numero_int: number | null
          oggetto: string | null
          ordine_id: string | null
          pagamento_id: string | null
          ragione_sociale: string | null
          soggetto_id: string | null
          stato: string | null
          valida_fino: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offerte_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_ordine_fk"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_ordine_fk"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini_elenco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_soggetto_id_fkey"
            columns: ["soggetto_id"]
            isOneToOne: false
            referencedRelation: "soggetti"
            referencedColumns: ["id"]
          },
        ]
      }
      ordini_elenco: {
        Row: {
          aggiornato_il: string | null
          anno: number | null
          azienda_id: string | null
          creato_da: string | null
          creato_il: string | null
          data: string | null
          data_consegna: string | null
          destinazione_id: string | null
          evasione: string | null
          id: string | null
          imponibile: number | null
          note: string | null
          note_interne: string | null
          numero: string | null
          numero_int: number | null
          offerta_id: string | null
          pagamento_id: string | null
          ragione_sociale: string | null
          residuo_valore: number | null
          riferimento: string | null
          soggetto_id: string | null
          stato: string | null
          tipo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordini_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_destinazione_id_fkey"
            columns: ["destinazione_id"]
            isOneToOne: false
            referencedRelation: "destinazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_offerta_id_fkey"
            columns: ["offerta_id"]
            isOneToOne: false
            referencedRelation: "offerte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_offerta_id_fkey"
            columns: ["offerta_id"]
            isOneToOne: false
            referencedRelation: "offerte_elenco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_soggetto_id_fkey"
            columns: ["soggetto_id"]
            isOneToOne: false
            referencedRelation: "soggetti"
            referencedColumns: ["id"]
          },
        ]
      }
      ordini_righe_evasione: {
        Row: {
          articolo_id: string | null
          azienda_id: string | null
          chiusa: boolean | null
          codice: string | null
          data_consegna: string | null
          descrizione: string | null
          id: string | null
          iva: number | null
          ordine_id: string | null
          posizione: number | null
          prezzo: number | null
          qta: number | null
          qta_evasa: number | null
          qta_in_bozza: number | null
          residuo: number | null
          sconto: number | null
          um: string | null
        }
        Insert: {
          articolo_id?: string | null
          azienda_id?: string | null
          chiusa?: boolean | null
          codice?: string | null
          data_consegna?: string | null
          descrizione?: string | null
          id?: string | null
          iva?: number | null
          ordine_id?: string | null
          posizione?: number | null
          prezzo?: number | null
          qta?: number | null
          qta_evasa?: never
          qta_in_bozza?: never
          residuo?: never
          sconto?: number | null
          um?: string | null
        }
        Update: {
          articolo_id?: string | null
          azienda_id?: string | null
          chiusa?: boolean | null
          codice?: string | null
          data_consegna?: string | null
          descrizione?: string | null
          id?: string | null
          iva?: number | null
          ordine_id?: string | null
          posizione?: number | null
          prezzo?: number | null
          qta?: number | null
          qta_evasa?: never
          qta_in_bozza?: never
          residuo?: never
          sconto?: number | null
          um?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordini_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "giacenze_articoli"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "ordini_righe_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_righe_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_righe_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini_elenco"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accetta_offerta: { Args: { _id: string }; Returns: string }
      aggiorna_mio_nome: {
        Args: { _cognome: string; _nome: string }
        Returns: undefined
      }
      analisi_magazzino: {
        Args: never
        Returns: {
          articolo_id: string
          codice: string
          copertura_giorni: number
          costo_medio: number
          descrizione: string
          prima_scadenza: string
          qta: number
          sotto_scorta: boolean
          ultima_vendita: string
          um: string
          valore: number
          venduto_90: number
        }[]
      }
      analisi_vendite: {
        Args: { _al: string; _dal: string; _per?: string }
        Returns: {
          chiave: string
          costo: number
          documenti: number
          etichetta: string
          margine: number
          perc_margine: number
          qta: number
          ricavo: number
        }[]
      }
      annulla_ddt: { Args: { _id: string }; Returns: undefined }
      azienda_corrente: { Args: never; Returns: string }
      chiudi_residuo: {
        Args: { _chiusa?: boolean; _riga: string }
        Returns: undefined
      }
      conferma_ddt: { Args: { _id: string }; Returns: string }
      costo_medio: { Args: { _articolo: string }; Returns: number }
      crea_azienda: {
        Args: {
          _cognome?: string
          _nome: string
          _nome_utente?: string
          _partita_iva?: string
        }
        Returns: string
      }
      cruscotto: { Args: never; Returns: Json }
      ddt_da_ordine: {
        Args: { _ddt?: string; _ordine: string; _righe?: Json }
        Returns: string
      }
      fine_mese: { Args: { _d: string }; Returns: string }
      genera_scadenze_ddt: { Args: { _id: string }; Returns: undefined }
      ha_permesso: { Args: { _p: string }; Returns: boolean }
      imposta_costo: {
        Args: { _articolo: string; _costo: number }
        Returns: undefined
      }
      previsionale: {
        Args: { _al: string; _dal: string }
        Returns: {
          certezza: string
          data: string
          descrizione: string
          importo: number
          ordine_id: string
          scadenza_id: string
          soggetto: string
          tipo: string
        }[]
      }
      prezzo_vendita: {
        Args: {
          _articolo: string
          _cliente: string
          _data?: string
          _qta?: number
        }
        Returns: {
          listino_id: string
          origine: string
          prezzo: number
          sconto: number
        }[]
      }
      prossimo_numero: {
        Args: { _anno: number; _azienda: string; _tipo: string }
        Returns: number
      }
      puo_ddt: {
        Args: { _causale: string; _direzione: string }
        Returns: boolean
      }
      puo_ordine: { Args: { _tipo: string }; Returns: boolean }
      rettifica_magazzino: {
        Args: {
          _articolo: string
          _costo?: number
          _inventario?: boolean
          _lotto?: string
          _magazzino: string
          _nota?: string
          _qta: number
          _scadenza?: string
        }
        Returns: string
      }
      riapri_ddt: {
        Args: { _annulla?: boolean; _id: string }
        Returns: undefined
      }
      riporta_da_fatturare: { Args: { _id: string }; Returns: undefined }
      segna_ddt_esportati: { Args: { _ids: string[] }; Returns: number }
      stato_ordine: {
        Args: { _id: string; _stato: string }
        Returns: undefined
      }
      stessa_azienda: {
        Args: { _azienda: string; _id: string; _tabella: unknown }
        Returns: boolean
      }
      totale_ddt: { Args: { _id: string }; Returns: number }
    }
    Enums: {
      ruolo: "titolare" | "ufficio" | "magazzino" | "agente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ruolo: ["titolare", "ufficio", "magazzino", "agente"],
    },
  },
} as const
