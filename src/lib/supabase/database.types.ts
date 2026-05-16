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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      action_recipients: {
        Row: {
          action_id: string
          company_id: string | null
          contact_id: string
          created_at: string | null
          id: string
          participation_id: string | null
        }
        Insert: {
          action_id: string
          company_id?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          participation_id?: string | null
        }
        Update: {
          action_id?: string
          company_id?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          participation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_recipients_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "action_list_view"
            referencedColumns: ["action_id"]
          },
          {
            foreignKeyName: "action_recipients_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_recipients_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "company_action_list_view"
            referencedColumns: ["action_id"]
          },
          {
            foreignKeyName: "action_recipients_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "contact_action_list_view"
            referencedColumns: ["action_id"]
          },
          {
            foreignKeyName: "action_recipients_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "event_action_list_view"
            referencedColumns: ["action_id"]
          },
          {
            foreignKeyName: "action_recipients_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "participation_action_list_view"
            referencedColumns: ["action_id"]
          },
          {
            foreignKeyName: "action_recipients_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "task_list_view"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "action_recipients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_recipients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_list_view"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "action_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_recipients_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participation_list_view"
            referencedColumns: ["participation_id"]
          },
          {
            foreignKeyName: "action_recipients_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_recipients_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "smm_workspace_view"
            referencedColumns: ["participation_id"]
          },
        ]
      }
      action_subjects: {
        Row: {
          action_id: string
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          event_id: string | null
          id: string
          participation_id: string | null
        }
        Insert: {
          action_id: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          participation_id?: string | null
        }
        Update: {
          action_id?: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          participation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_subjects_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "action_list_view"
            referencedColumns: ["action_id"]
          },
          {
            foreignKeyName: "action_subjects_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_subjects_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "company_action_list_view"
            referencedColumns: ["action_id"]
          },
          {
            foreignKeyName: "action_subjects_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "contact_action_list_view"
            referencedColumns: ["action_id"]
          },
          {
            foreignKeyName: "action_subjects_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "event_action_list_view"
            referencedColumns: ["action_id"]
          },
          {
            foreignKeyName: "action_subjects_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "participation_action_list_view"
            referencedColumns: ["action_id"]
          },
          {
            foreignKeyName: "action_subjects_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "task_list_view"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "action_subjects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_subjects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_list_view"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "action_subjects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_subjects_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_subjects_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participation_list_view"
            referencedColumns: ["participation_id"]
          },
          {
            foreignKeyName: "action_subjects_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_subjects_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "smm_workspace_view"
            referencedColumns: ["participation_id"]
          },
        ]
      }
      action_templates: {
        Row: {
          action_type: string | null
          channel: string | null
          created_at: string | null
          default_due_offset_days: number | null
          description: string | null
          event_id: string
          id: string
          is_required: boolean | null
          sort_order: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          action_type?: string | null
          channel?: string | null
          created_at?: string | null
          default_due_offset_days?: number | null
          description?: string | null
          event_id: string
          id?: string
          is_required?: boolean | null
          sort_order?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          action_type?: string | null
          channel?: string | null
          created_at?: string | null
          default_due_offset_days?: number | null
          description?: string | null
          event_id?: string
          id?: string
          is_required?: boolean | null
          sort_order?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      actions: {
        Row: {
          action_type: string | null
          assigned_to: string | null
          channel: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          external_url: string | null
          id: string
          is_required: boolean | null
          organization_id: string | null
          priority: string | null
          source_template_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          action_type?: string | null
          assigned_to?: string | null
          channel?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          external_url?: string | null
          id?: string
          is_required?: boolean | null
          organization_id?: string | null
          priority?: string | null
          source_template_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          action_type?: string | null
          assigned_to?: string | null
          channel?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          external_url?: string | null
          id?: string
          is_required?: boolean | null
          organization_id?: string | null
          priority?: string | null
          source_template_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "action_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action: string | null
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_id: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
        }
        Insert: {
          action?: string | null
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
        }
        Update: {
          action?: string | null
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booth_applications: {
        Row: {
          association: string[] | null
          brands: string | null
          brevo_error: string | null
          brevo_synced: boolean | null
          company_name: string | null
          created_at: string | null
          email: string
          exposition: string[] | null
          first_name: string | null
          id: string
          ip: string | null
          job_title: string | null
          last_name: string | null
          phone: string | null
          product_group: string[] | null
          raw_payload: Json
          submission_id: string
          updated_at: string | null
          user_agent: string | null
          utm: Json | null
        }
        Insert: {
          association?: string[] | null
          brands?: string | null
          brevo_error?: string | null
          brevo_synced?: boolean | null
          company_name?: string | null
          created_at?: string | null
          email: string
          exposition?: string[] | null
          first_name?: string | null
          id?: string
          ip?: string | null
          job_title?: string | null
          last_name?: string | null
          phone?: string | null
          product_group?: string[] | null
          raw_payload: Json
          submission_id: string
          updated_at?: string | null
          user_agent?: string | null
          utm?: Json | null
        }
        Update: {
          association?: string[] | null
          brands?: string | null
          brevo_error?: string | null
          brevo_synced?: boolean | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          exposition?: string[] | null
          first_name?: string | null
          id?: string
          ip?: string | null
          job_title?: string | null
          last_name?: string | null
          phone?: string | null
          product_group?: string[] | null
          raw_payload?: Json
          submission_id?: string
          updated_at?: string | null
          user_agent?: string | null
          utm?: Json | null
        }
        Relationships: []
      }
      booth_assignments: {
        Row: {
          assigned_at: string | null
          booth_id: string | null
          id: string
          notes: string | null
          participation_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          booth_id?: string | null
          id?: string
          notes?: string | null
          participation_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          booth_id?: string | null
          id?: string
          notes?: string | null
          participation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booth_assignments_booth_id_fkey"
            columns: ["booth_id"]
            isOneToOne: false
            referencedRelation: "booths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booth_assignments_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participation_list_view"
            referencedColumns: ["participation_id"]
          },
          {
            foreignKeyName: "booth_assignments_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booth_assignments_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "smm_workspace_view"
            referencedColumns: ["participation_id"]
          },
        ]
      }
      booths: {
        Row: {
          area_sqm: number | null
          booth_number: string
          booth_type: string | null
          created_at: string | null
          event_id: string | null
          hall: string | null
          id: string
          notes: string | null
          status: string | null
          updated_at: string | null
          zone: string | null
        }
        Insert: {
          area_sqm?: number | null
          booth_number: string
          booth_type?: string | null
          created_at?: string | null
          event_id?: string | null
          hall?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          zone?: string | null
        }
        Update: {
          area_sqm?: number | null
          booth_number?: string
          booth_type?: string | null
          created_at?: string | null
          event_id?: string | null
          hall?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booths_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          brand_description: string | null
          brand_logo_url: string | null
          brand_name: string
          country: string | null
          created_at: string | null
          id: string
          organization_id: string | null
          source_appsheet_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          brand_description?: string | null
          brand_logo_url?: string | null
          brand_name: string
          country?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          source_appsheet_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          brand_description?: string | null
          brand_logo_url?: string | null
          brand_name?: string
          country?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string | null
          source_appsheet_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      card_contact_submissions: {
        Row: {
          brevo_error: string | null
          brevo_synced: boolean | null
          company: string | null
          consent: boolean
          created_at: string | null
          email: string
          form_slug: string
          full_name: string
          id: string
          ip: string | null
          message: string | null
          page: string
          person: string
          phone: string
          raw_payload: Json
          submission_id: string
          user_agent: string | null
          utm: Json | null
        }
        Insert: {
          brevo_error?: string | null
          brevo_synced?: boolean | null
          company?: string | null
          consent?: boolean
          created_at?: string | null
          email: string
          form_slug: string
          full_name: string
          id?: string
          ip?: string | null
          message?: string | null
          page: string
          person: string
          phone: string
          raw_payload: Json
          submission_id: string
          user_agent?: string | null
          utm?: Json | null
        }
        Update: {
          brevo_error?: string | null
          brevo_synced?: boolean | null
          company?: string | null
          consent?: boolean
          created_at?: string | null
          email?: string
          form_slug?: string
          full_name?: string
          id?: string
          ip?: string | null
          message?: string | null
          page?: string
          person?: string
          phone?: string
          raw_payload?: Json
          submission_id?: string
          user_agent?: string | null
          utm?: Json | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string
          company_phone: string | null
          country: string | null
          created_at: string | null
          description: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          legal_name: string | null
          linkedin_url: string | null
          organization_id: string | null
          other_social_url: string | null
          source_appsheet_id: string | null
          telegram_url: string | null
          updated_at: string | null
          website: string | null
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name: string
          company_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          legal_name?: string | null
          linkedin_url?: string | null
          organization_id?: string | null
          other_social_url?: string | null
          source_appsheet_id?: string | null
          telegram_url?: string | null
          updated_at?: string | null
          website?: string | null
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          legal_name?: string | null
          linkedin_url?: string | null
          organization_id?: string | null
          other_social_url?: string | null
          source_appsheet_id?: string | null
          telegram_url?: string | null
          updated_at?: string | null
          website?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_brands: {
        Row: {
          brand_id: string | null
          company_id: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          brand_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          brand_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_list_view"
            referencedColumns: ["company_id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          role: string | null
          source_appsheet_id: string | null
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          role?: string | null
          source_appsheet_id?: string | null
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          role?: string | null
          source_appsheet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_list_view"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          organization_id: string | null
          phone: string | null
          position: string | null
          source_appsheet_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          position?: string | null
          source_appsheet_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          position?: string | null
          source_appsheet_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_program_items: {
        Row: {
          created_at: string | null
          description: string | null
          ends_at: string | null
          event_id: string
          id: string
          item_type: string | null
          section_id: string | null
          starts_at: string | null
          status: string | null
          title: string
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          event_id: string
          id?: string
          item_type?: string | null
          section_id?: string | null
          starts_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          event_id?: string
          id?: string
          item_type?: string | null
          section_id?: string | null
          starts_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_program_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_program_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "event_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sections: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          name: string
          slug: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          name: string
          slug?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          name?: string
          slug?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_sections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          build_up_end: string | null
          build_up_start: string | null
          city: string | null
          country: string | null
          created_at: string | null
          dismantling_end: string | null
          dismantling_start: string | null
          end_date: string | null
          event_name: string
          event_slug: string | null
          id: string
          organization_id: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          venue_name: string | null
        }
        Insert: {
          build_up_end?: string | null
          build_up_start?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          dismantling_end?: string | null
          dismantling_start?: string | null
          end_date?: string | null
          event_name: string
          event_slug?: string | null
          id?: string
          organization_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          venue_name?: string | null
        }
        Update: {
          build_up_end?: string | null
          build_up_start?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          dismantling_end?: string | null
          dismantling_start?: string | null
          end_date?: string | null
          event_name?: string
          event_slug?: string | null
          id?: string
          organization_id?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitor_materials: {
        Row: {
          created_at: string | null
          id: string
          material_type: string | null
          notes: string | null
          participation_id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_type?: string | null
          notes?: string | null
          participation_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          material_type?: string | null
          notes?: string | null
          participation_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibitor_materials_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participation_list_view"
            referencedColumns: ["participation_id"]
          },
          {
            foreignKeyName: "exhibitor_materials_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibitor_materials_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "smm_workspace_view"
            referencedColumns: ["participation_id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          brevo_error: string | null
          brevo_synced: boolean | null
          consent: boolean
          created_at: string | null
          email: string
          id: string
          ip: string | null
          raw_payload: Json | null
          submission_id: string
          subscribed_from: string
          user_agent: string | null
          utm: Json | null
        }
        Insert: {
          brevo_error?: string | null
          brevo_synced?: boolean | null
          consent?: boolean
          created_at?: string | null
          email: string
          id?: string
          ip?: string | null
          raw_payload?: Json | null
          submission_id: string
          subscribed_from: string
          user_agent?: string | null
          utm?: Json | null
        }
        Update: {
          brevo_error?: string | null
          brevo_synced?: boolean | null
          consent?: boolean
          created_at?: string | null
          email?: string
          id?: string
          ip?: string | null
          raw_payload?: Json | null
          submission_id?: string
          subscribed_from?: string
          user_agent?: string | null
          utm?: Json | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          body: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          event_id: string | null
          id: string
          note_type: string | null
          organization_id: string | null
          participation_id: string | null
        }
        Insert: {
          body?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          note_type?: string | null
          organization_id?: string | null
          participation_id?: string | null
        }
        Update: {
          body?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          event_id?: string | null
          id?: string
          note_type?: string | null
          organization_id?: string | null
          participation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_list_view"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participation_list_view"
            referencedColumns: ["participation_id"]
          },
          {
            foreignKeyName: "notes_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "smm_workspace_view"
            referencedColumns: ["participation_id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      participation_brands: {
        Row: {
          brand_id: string | null
          created_at: string | null
          display_on_website: boolean | null
          id: string
          participation_id: string | null
          priority: number | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          display_on_website?: boolean | null
          id?: string
          participation_id?: string | null
          priority?: number | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          display_on_website?: boolean | null
          id?: string
          participation_id?: string | null
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "participation_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_brands_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participation_list_view"
            referencedColumns: ["participation_id"]
          },
          {
            foreignKeyName: "participation_brands_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_brands_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "smm_workspace_view"
            referencedColumns: ["participation_id"]
          },
        ]
      }
      participation_contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          participation_id: string
          role: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          participation_id: string
          role?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          participation_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participation_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_contacts_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participation_list_view"
            referencedColumns: ["participation_id"]
          },
          {
            foreignKeyName: "participation_contacts_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_contacts_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "smm_workspace_view"
            referencedColumns: ["participation_id"]
          },
        ]
      }
      participation_logistics: {
        Row: {
          badges_status: string | null
          check_in_status: string | null
          conference_status: string | null
          created_at: string | null
          electricity_status: string | null
          fascia_status: string | null
          furniture_status: string | null
          id: string
          internet_status: string | null
          notes: string | null
          participation_id: string | null
          room_asset_status: string | null
          source_appsheet_id: string | null
          stand_design_status: string | null
          updated_at: string | null
        }
        Insert: {
          badges_status?: string | null
          check_in_status?: string | null
          conference_status?: string | null
          created_at?: string | null
          electricity_status?: string | null
          fascia_status?: string | null
          furniture_status?: string | null
          id?: string
          internet_status?: string | null
          notes?: string | null
          participation_id?: string | null
          room_asset_status?: string | null
          source_appsheet_id?: string | null
          stand_design_status?: string | null
          updated_at?: string | null
        }
        Update: {
          badges_status?: string | null
          check_in_status?: string | null
          conference_status?: string | null
          created_at?: string | null
          electricity_status?: string | null
          fascia_status?: string | null
          furniture_status?: string | null
          id?: string
          internet_status?: string | null
          notes?: string | null
          participation_id?: string | null
          room_asset_status?: string | null
          source_appsheet_id?: string | null
          stand_design_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participation_logistics_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: true
            referencedRelation: "participation_list_view"
            referencedColumns: ["participation_id"]
          },
          {
            foreignKeyName: "participation_logistics_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: true
            referencedRelation: "participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_logistics_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: true
            referencedRelation: "smm_workspace_view"
            referencedColumns: ["participation_id"]
          },
        ]
      }
      participations: {
        Row: {
          booking_status: string | null
          company_id: string | null
          created_at: string | null
          display_name: string | null
          event_id: string | null
          id: string
          internal_notes: string | null
          logistics_status: string | null
          materials_status: string | null
          organization_id: string | null
          package_name: string | null
          participation_type: string | null
          payment_status: string | null
          profile_status: string | null
          sales_owner_id: string | null
          smm_status: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          booking_status?: string | null
          company_id?: string | null
          created_at?: string | null
          display_name?: string | null
          event_id?: string | null
          id?: string
          internal_notes?: string | null
          logistics_status?: string | null
          materials_status?: string | null
          organization_id?: string | null
          package_name?: string | null
          participation_type?: string | null
          payment_status?: string | null
          profile_status?: string | null
          sales_owner_id?: string | null
          smm_status?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_status?: string | null
          company_id?: string | null
          created_at?: string | null
          display_name?: string | null
          event_id?: string | null
          id?: string
          internal_notes?: string | null
          logistics_status?: string | null
          materials_status?: string | null
          organization_id?: string | null
          package_name?: string | null
          participation_type?: string | null
          payment_status?: string | null
          profile_status?: string | null
          sales_owner_id?: string | null
          smm_status?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_list_view"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "participations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_sales_owner_id_fkey"
            columns: ["sales_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          role: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
          role: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          role?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      smm_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          participation_id: string | null
          platform: string | null
          publication_url: string | null
          published_at: string | null
          status: string | null
          task_type: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          participation_id?: string | null
          platform?: string | null
          publication_url?: string | null
          published_at?: string | null
          status?: string | null
          task_type?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          participation_id?: string | null
          platform?: string | null
          publication_url?: string | null
          published_at?: string | null
          status?: string | null
          task_type?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smm_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smm_tasks_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participation_list_view"
            referencedColumns: ["participation_id"]
          },
          {
            foreignKeyName: "smm_tasks_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smm_tasks_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "smm_workspace_view"
            referencedColumns: ["participation_id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          event_id: string | null
          id: string
          organization_id: string | null
          participation_id: string | null
          priority: string | null
          status: string | null
          task_category: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          organization_id?: string | null
          participation_id?: string | null
          priority?: string | null
          status?: string | null
          task_category?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          organization_id?: string | null
          participation_id?: string | null
          priority?: string | null
          status?: string | null
          task_category?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_list_view"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participation_list_view"
            referencedColumns: ["participation_id"]
          },
          {
            foreignKeyName: "tasks_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "smm_workspace_view"
            referencedColumns: ["participation_id"]
          },
        ]
      }
      visitor_registrations: {
        Row: {
          brevo_error: string | null
          brevo_synced: boolean | null
          cedia_membership_interest: string | null
          city: string | null
          company_name: string | null
          company_profile: string[] | null
          country: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          ip: string | null
          job_title: string | null
          knx_membership_interest: string | null
          last_name: string | null
          nationality: string | null
          phone: string | null
          products: string[] | null
          raw_payload: Json
          seminars: string[] | null
          submission_id: string
          uae_resident: boolean | null
          updated_at: string | null
          user_agent: string | null
          utm: Json | null
          visit_purpose: string | null
          whatsapp_last_campaign_at: string | null
          whatsapp_opt_in: boolean
          whatsapp_phone: string | null
          whatsapp_sync_status: string | null
          whatsapp_unsubscribed: boolean
        }
        Insert: {
          brevo_error?: string | null
          brevo_synced?: boolean | null
          cedia_membership_interest?: string | null
          city?: string | null
          company_name?: string | null
          company_profile?: string[] | null
          country?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          ip?: string | null
          job_title?: string | null
          knx_membership_interest?: string | null
          last_name?: string | null
          nationality?: string | null
          phone?: string | null
          products?: string[] | null
          raw_payload: Json
          seminars?: string[] | null
          submission_id: string
          uae_resident?: boolean | null
          updated_at?: string | null
          user_agent?: string | null
          utm?: Json | null
          visit_purpose?: string | null
          whatsapp_last_campaign_at?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_phone?: string | null
          whatsapp_sync_status?: string | null
          whatsapp_unsubscribed?: boolean
        }
        Update: {
          brevo_error?: string | null
          brevo_synced?: boolean | null
          cedia_membership_interest?: string | null
          city?: string | null
          company_name?: string | null
          company_profile?: string[] | null
          country?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          ip?: string | null
          job_title?: string | null
          knx_membership_interest?: string | null
          last_name?: string | null
          nationality?: string | null
          phone?: string | null
          products?: string[] | null
          raw_payload?: Json
          seminars?: string[] | null
          submission_id?: string
          uae_resident?: boolean | null
          updated_at?: string | null
          user_agent?: string | null
          utm?: Json | null
          visit_purpose?: string | null
          whatsapp_last_campaign_at?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_phone?: string | null
          whatsapp_sync_status?: string | null
          whatsapp_unsubscribed?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      action_list_view: {
        Row: {
          action_id: string | null
          action_type: string | null
          assigned_to: string | null
          channel: string | null
          company_id: string | null
          company_name: string | null
          completed_at: string | null
          contact_id: string | null
          contact_name: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          event_id: string | null
          event_name: string | null
          external_url: string | null
          is_required: boolean | null
          participation_id: string | null
          participation_name: string | null
          priority: string | null
          status: string | null
          subject_summary: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_booth_applications: {
        Row: {
          association: string[] | null
          brands: string | null
          brevo_error: string | null
          brevo_synced: boolean | null
          company_name: string | null
          created_at: string | null
          email: string | null
          exposition: string[] | null
          first_name: string | null
          id: string | null
          ip: string | null
          job_title: string | null
          last_name: string | null
          phone: string | null
          product_group: string[] | null
          raw_payload: Json | null
          submission_id: string | null
          updated_at: string | null
          user_agent: string | null
          utm: Json | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          association?: string[] | null
          brands?: string | null
          brevo_error?: string | null
          brevo_synced?: boolean | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          exposition?: string[] | null
          first_name?: string | null
          id?: string | null
          ip?: string | null
          job_title?: string | null
          last_name?: string | null
          phone?: string | null
          product_group?: string[] | null
          raw_payload?: Json | null
          submission_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          utm?: Json | null
          utm_campaign?: never
          utm_content?: never
          utm_medium?: never
          utm_source?: never
          utm_term?: never
        }
        Update: {
          association?: string[] | null
          brands?: string | null
          brevo_error?: string | null
          brevo_synced?: boolean | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          exposition?: string[] | null
          first_name?: string | null
          id?: string | null
          ip?: string | null
          job_title?: string | null
          last_name?: string | null
          phone?: string | null
          product_group?: string[] | null
          raw_payload?: Json | null
          submission_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          utm?: Json | null
          utm_campaign?: never
          utm_content?: never
          utm_medium?: never
          utm_source?: never
          utm_term?: never
        }
        Relationships: []
      }
      admin_visitor_registrations: {
        Row: {
          brevo_error: string | null
          brevo_synced: boolean | null
          cedia_membership_interest: string | null
          city: string | null
          company_name: string | null
          company_profile: string[] | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          ip: string | null
          job_title: string | null
          knx_membership_interest: string | null
          last_name: string | null
          nationality: string | null
          phone: string | null
          products: string[] | null
          raw_payload: Json | null
          seminars: string[] | null
          submission_id: string | null
          uae_resident: boolean | null
          updated_at: string | null
          user_agent: string | null
          utm: Json | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visit_purpose: string | null
          whatsapp_last_campaign_at: string | null
          whatsapp_opt_in: boolean | null
          whatsapp_phone: string | null
          whatsapp_sync_status: string | null
          whatsapp_unsubscribed: boolean | null
        }
        Insert: {
          brevo_error?: string | null
          brevo_synced?: boolean | null
          cedia_membership_interest?: string | null
          city?: string | null
          company_name?: string | null
          company_profile?: string[] | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          ip?: string | null
          job_title?: string | null
          knx_membership_interest?: string | null
          last_name?: string | null
          nationality?: string | null
          phone?: string | null
          products?: string[] | null
          raw_payload?: Json | null
          seminars?: string[] | null
          submission_id?: string | null
          uae_resident?: boolean | null
          updated_at?: string | null
          user_agent?: string | null
          utm?: Json | null
          utm_campaign?: never
          utm_medium?: never
          utm_source?: never
          visit_purpose?: string | null
          whatsapp_last_campaign_at?: string | null
          whatsapp_opt_in?: boolean | null
          whatsapp_phone?: string | null
          whatsapp_sync_status?: string | null
          whatsapp_unsubscribed?: boolean | null
        }
        Update: {
          brevo_error?: string | null
          brevo_synced?: boolean | null
          cedia_membership_interest?: string | null
          city?: string | null
          company_name?: string | null
          company_profile?: string[] | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          ip?: string | null
          job_title?: string | null
          knx_membership_interest?: string | null
          last_name?: string | null
          nationality?: string | null
          phone?: string | null
          products?: string[] | null
          raw_payload?: Json | null
          seminars?: string[] | null
          submission_id?: string | null
          uae_resident?: boolean | null
          updated_at?: string | null
          user_agent?: string | null
          utm?: Json | null
          utm_campaign?: never
          utm_medium?: never
          utm_source?: never
          visit_purpose?: string | null
          whatsapp_last_campaign_at?: string | null
          whatsapp_opt_in?: boolean | null
          whatsapp_phone?: string | null
          whatsapp_sync_status?: string | null
          whatsapp_unsubscribed?: boolean | null
        }
        Relationships: []
      }
      company_action_list_view: {
        Row: {
          action_id: string | null
          action_type: string | null
          assigned_to: string | null
          channel: string | null
          company_id: string | null
          company_name: string | null
          description: string | null
          due_date: string | null
          is_required: boolean | null
          participation_id: string | null
          priority: string | null
          status: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_list_view: {
        Row: {
          booth_numbers: string | null
          city: string | null
          company_id: string | null
          company_name: string | null
          country: string | null
          event_id: string | null
          logo_url: string | null
          main_contact_email: string | null
          main_contact_name: string | null
          main_contact_phone: string | null
          participation_status: string | null
          website: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_action_list_view: {
        Row: {
          action_id: string | null
          action_type: string | null
          assigned_to: string | null
          channel: string | null
          company_id: string | null
          contact_id: string | null
          contact_name: string | null
          description: string | null
          due_date: string | null
          is_required: boolean | null
          participation_id: string | null
          priority: string | null
          status: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_action_list_view: {
        Row: {
          action_id: string | null
          action_type: string | null
          assigned_to: string | null
          channel: string | null
          description: string | null
          due_date: string | null
          event_id: string | null
          event_name: string | null
          is_required: boolean | null
          priority: string | null
          status: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_subjects_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_booth_applications: {
        Row: {
          association: string[] | null
          brevo_error: string | null
          brevo_synced: boolean | null
          created_at: string | null
          exposition: string[] | null
          product_group: string[] | null
          submission_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          association?: string[] | null
          brevo_error?: string | null
          brevo_synced?: boolean | null
          created_at?: string | null
          exposition?: string[] | null
          product_group?: string[] | null
          submission_id?: string | null
          utm_campaign?: never
          utm_content?: never
          utm_medium?: never
          utm_source?: never
          utm_term?: never
        }
        Update: {
          association?: string[] | null
          brevo_error?: string | null
          brevo_synced?: boolean | null
          created_at?: string | null
          exposition?: string[] | null
          product_group?: string[] | null
          submission_id?: string | null
          utm_campaign?: never
          utm_content?: never
          utm_medium?: never
          utm_source?: never
          utm_term?: never
        }
        Relationships: []
      }
      marketing_visitor_registrations: {
        Row: {
          brevo_error: string | null
          brevo_synced: boolean | null
          cedia_membership_interest: string | null
          company_profile: string[] | null
          country: string | null
          created_at: string | null
          knx_membership_interest: string | null
          products: string[] | null
          seminars: string[] | null
          submission_id: string | null
          uae_resident: boolean | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visit_purpose: string | null
          whatsapp_opt_in: boolean | null
          whatsapp_sync_status: string | null
          whatsapp_unsubscribed: boolean | null
        }
        Insert: {
          brevo_error?: string | null
          brevo_synced?: boolean | null
          cedia_membership_interest?: string | null
          company_profile?: string[] | null
          country?: string | null
          created_at?: string | null
          knx_membership_interest?: string | null
          products?: string[] | null
          seminars?: string[] | null
          submission_id?: string | null
          uae_resident?: boolean | null
          utm_campaign?: never
          utm_medium?: never
          utm_source?: never
          visit_purpose?: string | null
          whatsapp_opt_in?: boolean | null
          whatsapp_sync_status?: string | null
          whatsapp_unsubscribed?: boolean | null
        }
        Update: {
          brevo_error?: string | null
          brevo_synced?: boolean | null
          cedia_membership_interest?: string | null
          company_profile?: string[] | null
          country?: string | null
          created_at?: string | null
          knx_membership_interest?: string | null
          products?: string[] | null
          seminars?: string[] | null
          submission_id?: string | null
          uae_resident?: boolean | null
          utm_campaign?: never
          utm_medium?: never
          utm_source?: never
          visit_purpose?: string | null
          whatsapp_opt_in?: boolean | null
          whatsapp_sync_status?: string | null
          whatsapp_unsubscribed?: boolean | null
        }
        Relationships: []
      }
      participation_action_list_view: {
        Row: {
          action_id: string | null
          action_type: string | null
          assigned_to: string | null
          channel: string | null
          company_id: string | null
          description: string | null
          due_date: string | null
          event_id: string | null
          is_required: boolean | null
          participation_id: string | null
          priority: string | null
          status: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participation_list_view: {
        Row: {
          booth_numbers: string | null
          company_id: string | null
          company_name: string | null
          event_id: string | null
          logistics_status: string | null
          logo_url: string | null
          main_contact_email: string | null
          main_contact_name: string | null
          package_name: string | null
          participation_id: string | null
          participation_type: string | null
          payment_status: string | null
          profile_status: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_list_view"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "participations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_booth_applications: {
        Row: {
          association: string[] | null
          brands: string | null
          brevo_error: string | null
          brevo_synced: boolean | null
          company_name: string | null
          created_at: string | null
          email: string | null
          exposition: string[] | null
          first_name: string | null
          job_title: string | null
          last_name: string | null
          phone: string | null
          product_group: string[] | null
          submission_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          association?: string[] | null
          brands?: string | null
          brevo_error?: string | null
          brevo_synced?: boolean | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          exposition?: string[] | null
          first_name?: string | null
          job_title?: string | null
          last_name?: string | null
          phone?: string | null
          product_group?: string[] | null
          submission_id?: string | null
          utm_campaign?: never
          utm_content?: never
          utm_medium?: never
          utm_source?: never
          utm_term?: never
        }
        Update: {
          association?: string[] | null
          brands?: string | null
          brevo_error?: string | null
          brevo_synced?: boolean | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          exposition?: string[] | null
          first_name?: string | null
          job_title?: string | null
          last_name?: string | null
          phone?: string | null
          product_group?: string[] | null
          submission_id?: string | null
          utm_campaign?: never
          utm_content?: never
          utm_medium?: never
          utm_source?: never
          utm_term?: never
        }
        Relationships: []
      }
      sales_visitor_registrations: {
        Row: {
          brevo_error: string | null
          brevo_synced: boolean | null
          cedia_membership_interest: string | null
          city: string | null
          company_name: string | null
          company_profile: string[] | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          job_title: string | null
          knx_membership_interest: string | null
          last_name: string | null
          nationality: string | null
          phone: string | null
          products: string[] | null
          seminars: string[] | null
          submission_id: string | null
          uae_resident: boolean | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visit_purpose: string | null
          whatsapp_last_campaign_at: string | null
          whatsapp_opt_in: boolean | null
          whatsapp_phone: string | null
          whatsapp_sync_status: string | null
          whatsapp_unsubscribed: boolean | null
        }
        Insert: {
          brevo_error?: string | null
          brevo_synced?: boolean | null
          cedia_membership_interest?: string | null
          city?: string | null
          company_name?: string | null
          company_profile?: string[] | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          job_title?: string | null
          knx_membership_interest?: string | null
          last_name?: string | null
          nationality?: string | null
          phone?: string | null
          products?: string[] | null
          seminars?: string[] | null
          submission_id?: string | null
          uae_resident?: boolean | null
          utm_campaign?: never
          utm_medium?: never
          utm_source?: never
          visit_purpose?: string | null
          whatsapp_last_campaign_at?: string | null
          whatsapp_opt_in?: boolean | null
          whatsapp_phone?: string | null
          whatsapp_sync_status?: string | null
          whatsapp_unsubscribed?: boolean | null
        }
        Update: {
          brevo_error?: string | null
          brevo_synced?: boolean | null
          cedia_membership_interest?: string | null
          city?: string | null
          company_name?: string | null
          company_profile?: string[] | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          job_title?: string | null
          knx_membership_interest?: string | null
          last_name?: string | null
          nationality?: string | null
          phone?: string | null
          products?: string[] | null
          seminars?: string[] | null
          submission_id?: string | null
          uae_resident?: boolean | null
          utm_campaign?: never
          utm_medium?: never
          utm_source?: never
          visit_purpose?: string | null
          whatsapp_last_campaign_at?: string | null
          whatsapp_opt_in?: boolean | null
          whatsapp_phone?: string | null
          whatsapp_sync_status?: string | null
          whatsapp_unsubscribed?: boolean | null
        }
        Relationships: []
      }
      smm_workspace_view: {
        Row: {
          booth_numbers: string | null
          company_id: string | null
          company_name: string | null
          description: string | null
          description_status: string | null
          event_id: string | null
          facebook_url: string | null
          instagram_url: string | null
          last_post_url: string | null
          linkedin_url: string | null
          logo_status: string | null
          logo_url: string | null
          materials_status: string | null
          materials_url: string | null
          next_task_due_date: string | null
          next_task_title: string | null
          other_socials: string | null
          participation_id: string | null
          smm_status: string | null
          website: string | null
          youtube_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_list_view"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "participations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      task_list_view: {
        Row: {
          assigned_to: string | null
          category: string | null
          company_id: string | null
          company_name: string | null
          due_date: string | null
          participation_id: string | null
          priority: string | null
          status: string | null
          task_id: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_organization: {
        Args: { target_organization_id: string }
        Returns: boolean
      }
      can_access_participation: {
        Args: { target_participation_id: string }
        Returns: boolean
      }
      current_profile_organization_id: { Args: never; Returns: string }
      current_profile_role: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
