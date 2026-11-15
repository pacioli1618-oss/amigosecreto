// GENERATED — do not edit by hand. Regenerate after every migration: `npm run db:types`.
// Only the public as_* functions matter here: the app talks to the database through them.

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
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      as_add_exclusion: {
        Args: {
          p_host_token: string
          p_participant_a_id: string
          p_participant_b_id: string
          p_slug: string
        }
        Returns: string
      }
      as_add_participants: {
        Args: { p_host_token: string; p_names: string[]; p_slug: string }
        Returns: Json
      }
      as_create_group: {
        Args: {
          p_budget?: number
          p_currency?: string
          p_device_id?: string
          p_exchange_date?: string
          p_host_name?: string
          p_locale?: string
          p_notes?: string
          p_title: string
        }
        Returns: Json
      }
      as_delete_exclusion: {
        Args: { p_exclusion_id: string; p_host_token: string; p_slug: string }
        Returns: undefined
      }
      as_delete_group: {
        Args: { p_host_token: string; p_slug: string }
        Returns: undefined
      }
      as_draw: {
        Args: { p_host_token: string; p_slug: string }
        Returns: string
      }
      as_get_group: { Args: { p_slug: string }; Returns: Json }
      as_get_group_as_host: {
        Args: { p_host_token: string; p_slug: string }
        Returns: Json
      }
      as_join_group: {
        Args: { p_device_id?: string; p_name: string; p_slug: string }
        Returns: Json
      }
      as_open_participant: {
        Args: {
          p_device_id?: string
          p_participant_token: string
          p_slug: string
        }
        Returns: Json
      }
      as_remove_participant: {
        Args: { p_host_token: string; p_participant_id: string; p_slug: string }
        Returns: undefined
      }
      as_reset_draw: {
        Args: { p_host_token: string; p_slug: string }
        Returns: undefined
      }
      as_reveal_recipient: {
        Args: { p_participant_token: string; p_slug: string }
        Returns: Json
      }
      as_set_wishes: {
        Args: { p_participant_token: string; p_slug: string; p_wishes: string }
        Returns: undefined
      }
      as_update_group: {
        Args: {
          p_budget?: number
          p_exchange_date?: string
          p_host_token: string
          p_notes?: string
          p_slug: string
          p_title: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
