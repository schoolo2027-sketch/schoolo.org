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
      accounts_settings: {
        Row: {
          academic_session: string | null
          auto_receipt_number: boolean
          auto_voucher_number: boolean
          created_at: string
          currency: string
          currency_symbol: string
          decimal_places: number
          discount_rules: Json | null
          email_settings: Json | null
          fine_rules: Json | null
          fiscal_year_start: string | null
          id: string
          invoice_template: Json | null
          late_fee_rules: Json | null
          monthly_generation: Json | null
          notification_settings: Json | null
          print_settings: Json | null
          receipt_prefix: string
          receipt_template: Json | null
          scholarship_rules: Json | null
          school_id: string
          sms_settings: Json | null
          updated_at: string
          voucher_prefix: string
          whatsapp_settings: Json | null
        }
        Insert: {
          academic_session?: string | null
          auto_receipt_number?: boolean
          auto_voucher_number?: boolean
          created_at?: string
          currency?: string
          currency_symbol?: string
          decimal_places?: number
          discount_rules?: Json | null
          email_settings?: Json | null
          fine_rules?: Json | null
          fiscal_year_start?: string | null
          id?: string
          invoice_template?: Json | null
          late_fee_rules?: Json | null
          monthly_generation?: Json | null
          notification_settings?: Json | null
          print_settings?: Json | null
          receipt_prefix?: string
          receipt_template?: Json | null
          scholarship_rules?: Json | null
          school_id: string
          sms_settings?: Json | null
          updated_at?: string
          voucher_prefix?: string
          whatsapp_settings?: Json | null
        }
        Update: {
          academic_session?: string | null
          auto_receipt_number?: boolean
          auto_voucher_number?: boolean
          created_at?: string
          currency?: string
          currency_symbol?: string
          decimal_places?: number
          discount_rules?: Json | null
          email_settings?: Json | null
          fine_rules?: Json | null
          fiscal_year_start?: string | null
          id?: string
          invoice_template?: Json | null
          late_fee_rules?: Json | null
          monthly_generation?: Json | null
          notification_settings?: Json | null
          print_settings?: Json | null
          receipt_prefix?: string
          receipt_template?: Json | null
          scholarship_rules?: Json | null
          school_id?: string
          sms_settings?: Json | null
          updated_at?: string
          voucher_prefix?: string
          whatsapp_settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      agreements: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          school_id: string | null
          sent_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          school_id?: string | null
          sent_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          school_id?: string | null
          sent_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string | null
          created_at: string
          date: string
          id: string
          marked_by: string | null
          school_id: string
          section_id: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          school_id: string
          section_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          school_id?: string
          section_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: number
          class_name: string
          created_at: string
          id: string
          numeric_level: number | null
          school_id: string
          shift: Database["public"]["Enums"]["shift_type"]
          updated_at: string
          version: Database["public"]["Enums"]["version_type"]
        }
        Insert: {
          academic_year?: number
          class_name: string
          created_at?: string
          id?: string
          numeric_level?: number | null
          school_id: string
          shift?: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
          version?: Database["public"]["Enums"]["version_type"]
        }
        Update: {
          academic_year?: number
          class_name?: string
          created_at?: string
          id?: string
          numeric_level?: number | null
          school_id?: string
          shift?: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
          version?: Database["public"]["Enums"]["version_type"]
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_transactions: {
        Row: {
          account_id: string | null
          amount: number
          approved_by: string | null
          attachment_url: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          description: string | null
          id: string
          method: string | null
          reference: string | null
          school_id: string
          updated_at: string
          vendor: string | null
          voucher_no: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          approved_by?: string | null
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          method?: string | null
          reference?: string | null
          school_id: string
          updated_at?: string
          vendor?: string | null
          voucher_no?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          approved_by?: string | null
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          method?: string | null
          reference?: string | null
          school_id?: string
          updated_at?: string
          vendor?: string | null
          voucher_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_transactions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_categories: {
        Row: {
          code: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          frequency: string
          id: string
          is_active: boolean
          is_mandatory: boolean
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_categories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year: number
          amount: number
          category_id: string
          class_id: string | null
          created_at: string
          deleted_at: string | null
          due_day: number | null
          id: string
          school_id: string
          section_id: string | null
          shift: string | null
          student_group: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          academic_year: number
          amount?: number
          category_id: string
          class_id?: string | null
          created_at?: string
          deleted_at?: string | null
          due_day?: number | null
          id?: string
          school_id: string
          section_id?: string | null
          shift?: string | null
          student_group?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          academic_year?: number
          amount?: number
          category_id?: string
          class_id?: string | null
          created_at?: string
          deleted_at?: string | null
          due_day?: number | null
          id?: string
          school_id?: string
          section_id?: string | null
          shift?: string | null
          student_group?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          academic_year: number
          amount: number
          class_id: string | null
          created_at: string
          description: string | null
          fee_type: string
          frequency: string
          id: string
          school_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: number
          amount: number
          class_id?: string | null
          created_at?: string
          description?: string | null
          fee_type: string
          frequency?: string
          id?: string
          school_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: number
          amount?: number
          class_id?: string | null
          created_at?: string
          description?: string | null
          fee_type?: string
          frequency?: string
          id?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      final_results: {
        Row: {
          academic_year: string | null
          class_id: string | null
          created_at: string
          created_by: string | null
          exam_ids: string[]
          id: string
          is_published: boolean
          name: string
          published_at: string | null
          school_id: string
          section_id: string | null
          updated_at: string
          weights: number[]
        }
        Insert: {
          academic_year?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          exam_ids?: string[]
          id?: string
          is_published?: boolean
          name: string
          published_at?: string | null
          school_id: string
          section_id?: string | null
          updated_at?: string
          weights?: number[]
        }
        Update: {
          academic_year?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          exam_ids?: string[]
          id?: string
          is_published?: boolean
          name?: string
          published_at?: string | null
          school_id?: string
          section_id?: string | null
          updated_at?: string
          weights?: number[]
        }
        Relationships: []
      }
      financial_accounts: {
        Row: {
          account_number: string | null
          created_at: string
          current_balance: number
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          opening_balance: number
          school_id: string
          type: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          current_balance?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          school_id: string
          type: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          created_at?: string
          current_balance?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          school_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          school_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          school_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          class_id: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          image_url: string | null
          school_id: string
          section_id: string | null
          subject_id: string | null
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          school_id: string
          section_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          school_id?: string
          section_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          created_at: string
          feedback: string | null
          grade: string | null
          homework_id: string
          id: string
          school_id: string
          student_id: string
          submission_url: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          grade?: string | null
          homework_id: string
          id?: string
          school_id: string
          student_id: string
          submission_url?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          grade?: string | null
          homework_id?: string
          id?: string
          school_id?: string
          student_id?: string
          submission_url?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      income_categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_categories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      income_transactions: {
        Row: {
          account_id: string | null
          amount: number
          attachment_url: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          description: string | null
          id: string
          method: string | null
          reference: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          method?: string | null
          reference?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          method?: string | null
          reference?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "income_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_transactions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      marks: {
        Row: {
          created_at: string
          grade: string | null
          id: string
          marks_obtained: number | null
          result_id: string
          school_id: string
          student_id: string
          subject_id: string
          total_marks: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade?: string | null
          id?: string
          marks_obtained?: number | null
          result_id: string
          school_id: string
          student_id: string
          subject_id: string
          total_marks?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string | null
          id?: string
          marks_obtained?: number | null
          result_id?: string
          school_id?: string
          student_id?: string
          subject_id?: string
          total_marks?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marks_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_broadcast: boolean
          posted_by: string | null
          school_id: string | null
          target_schools: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_broadcast?: boolean
          posted_by?: string | null
          school_id?: string | null
          target_schools?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_broadcast?: boolean
          posted_by?: string | null
          school_id?: string | null
          target_schools?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_settings: {
        Row: {
          created_at: string
          credentials: Json
          gateway: string
          id: string
          is_active: boolean
          is_sandbox: boolean
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          gateway: string
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          gateway?: string
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateway_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          fee_id: string | null
          fee_type: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_image: string | null
          receipt_number: string | null
          school_id: string
          status: Database["public"]["Enums"]["payment_status"]
          student_id: string
          transaction_id: string | null
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          fee_id?: string | null
          fee_type: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_image?: string | null
          receipt_number?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          student_id: string
          transaction_id?: string | null
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          fee_id?: string | null
          fee_type?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_image?: string | null
          receipt_number?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          student_id?: string
          transaction_id?: string | null
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_language: string | null
          school_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string | null
          school_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string | null
          school_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          deleted_at: string | null
          id: string
          issued_by: string | null
          issued_on: string
          ledger_ids: string[] | null
          method: string | null
          notes: string | null
          receipt_no: string
          reference: string | null
          school_id: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          issued_by?: string | null
          issued_on?: string
          ledger_ids?: string[] | null
          method?: string | null
          notes?: string | null
          receipt_no: string
          reference?: string | null
          school_id: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          issued_by?: string | null
          issued_on?: string
          ledger_ids?: string[] | null
          method?: string | null
          notes?: string | null
          receipt_no?: string
          reference?: string | null
          school_id?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          academic_year: number
          class_id: string | null
          created_at: string
          exam_name: string
          id: string
          is_published: boolean
          school_id: string
          section_id: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: number
          class_id?: string | null
          created_at?: string
          exam_name: string
          id?: string
          is_published?: boolean
          school_id: string
          section_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: number
          class_id?: string | null
          created_at?: string
          exam_name?: string
          id?: string
          is_published?: boolean
          school_id?: string
          section_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          account_id: string | null
          advance: number
          basic: number
          bonus: number
          created_at: string
          deduction: number
          deleted_at: string | null
          id: string
          month: string
          net: number
          notes: string | null
          paid_on: string | null
          payslip_no: string | null
          school_id: string
          staff_id: string | null
          status: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          advance?: number
          basic?: number
          bonus?: number
          created_at?: string
          deduction?: number
          deleted_at?: string | null
          id?: string
          month: string
          net?: number
          notes?: string | null
          paid_on?: string | null
          payslip_no?: string | null
          school_id: string
          staff_id?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          advance?: number
          basic?: number
          bonus?: number
          created_at?: string
          deduction?: number
          deleted_at?: string | null
          id?: string
          month?: string
          net?: number
          notes?: string | null
          paid_on?: string | null
          payslip_no?: string | null
          school_id?: string
          staff_id?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          admin_email: string | null
          admin_id_number: string | null
          admin_name: string | null
          bank_details: string | null
          bkash_merchant: string | null
          created_at: string
          default_version: string | null
          deleted_at: string | null
          eiin: string | null
          established_year: number | null
          id: string
          is_active: boolean
          max_students: number
          max_teachers: number
          mobile_banking_number: string | null
          nagad_merchant: string | null
          plan_name: string
          principal_name: string | null
          principal_signature: string | null
          registrar_signature: string | null
          school_address: string | null
          school_code: string | null
          school_email: string | null
          school_logo: string | null
          school_name: string
          school_phone: string | null
          short_name: string | null
          sslcommerz_store_id: string | null
          student_login_enabled: boolean
          subscription_expiry: string | null
          teacher_login_enabled: boolean
          updated_at: string
          website: string | null
        }
        Insert: {
          admin_email?: string | null
          admin_id_number?: string | null
          admin_name?: string | null
          bank_details?: string | null
          bkash_merchant?: string | null
          created_at?: string
          default_version?: string | null
          deleted_at?: string | null
          eiin?: string | null
          established_year?: number | null
          id?: string
          is_active?: boolean
          max_students?: number
          max_teachers?: number
          mobile_banking_number?: string | null
          nagad_merchant?: string | null
          plan_name?: string
          principal_name?: string | null
          principal_signature?: string | null
          registrar_signature?: string | null
          school_address?: string | null
          school_code?: string | null
          school_email?: string | null
          school_logo?: string | null
          school_name: string
          school_phone?: string | null
          short_name?: string | null
          sslcommerz_store_id?: string | null
          student_login_enabled?: boolean
          subscription_expiry?: string | null
          teacher_login_enabled?: boolean
          updated_at?: string
          website?: string | null
        }
        Update: {
          admin_email?: string | null
          admin_id_number?: string | null
          admin_name?: string | null
          bank_details?: string | null
          bkash_merchant?: string | null
          created_at?: string
          default_version?: string | null
          deleted_at?: string | null
          eiin?: string | null
          established_year?: number | null
          id?: string
          is_active?: boolean
          max_students?: number
          max_teachers?: number
          mobile_banking_number?: string | null
          nagad_merchant?: string | null
          plan_name?: string
          principal_name?: string | null
          principal_signature?: string | null
          registrar_signature?: string | null
          school_address?: string | null
          school_code?: string | null
          school_email?: string | null
          school_logo?: string | null
          school_name?: string
          school_phone?: string | null
          short_name?: string | null
          sslcommerz_store_id?: string | null
          student_login_enabled?: boolean
          subscription_expiry?: string | null
          teacher_login_enabled?: boolean
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      sections: {
        Row: {
          class_id: string
          created_at: string
          id: string
          school_id: string
          section_name: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          school_id: string
          section_name: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string
          section_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          address: string | null
          attendance_scope_staff: boolean
          attendance_scope_students: boolean
          attendance_scope_teachers: boolean
          blood_group: string | null
          can_manage_attendance: boolean
          can_manage_classes: boolean
          can_manage_homework: boolean
          can_manage_notices: boolean
          can_manage_payments: boolean
          can_manage_results: boolean
          can_manage_settings: boolean
          can_manage_students: boolean
          can_manage_teachers: boolean
          can_use_ai_tools: boolean
          can_view_reports: boolean
          created_at: string
          designation: string | null
          email: string | null
          id: string
          is_active: boolean
          joining_date: string | null
          phone: string | null
          photo: string | null
          school_id: string
          staff_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          attendance_scope_staff?: boolean
          attendance_scope_students?: boolean
          attendance_scope_teachers?: boolean
          blood_group?: string | null
          can_manage_attendance?: boolean
          can_manage_classes?: boolean
          can_manage_homework?: boolean
          can_manage_notices?: boolean
          can_manage_payments?: boolean
          can_manage_results?: boolean
          can_manage_settings?: boolean
          can_manage_students?: boolean
          can_manage_teachers?: boolean
          can_use_ai_tools?: boolean
          can_view_reports?: boolean
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          joining_date?: string | null
          phone?: string | null
          photo?: string | null
          school_id: string
          staff_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          attendance_scope_staff?: boolean
          attendance_scope_students?: boolean
          attendance_scope_teachers?: boolean
          blood_group?: string | null
          can_manage_attendance?: boolean
          can_manage_classes?: boolean
          can_manage_homework?: boolean
          can_manage_notices?: boolean
          can_manage_payments?: boolean
          can_manage_results?: boolean
          can_manage_settings?: boolean
          can_manage_students?: boolean
          can_manage_teachers?: boolean
          can_use_ai_tools?: boolean
          can_view_reports?: boolean
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          joining_date?: string | null
          phone?: string | null
          photo?: string | null
          school_id?: string
          staff_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_by: string | null
          school_id: string
          staff_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          school_id: string
          staff_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          school_id?: string
          staff_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      student_ledger: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          deleted_at: string | null
          discount: number
          due_date: string | null
          fine: number
          id: string
          notes: string | null
          paid: number
          period: string | null
          school_id: string
          status: string
          structure_id: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          discount?: number
          due_date?: string | null
          fine?: number
          id?: string
          notes?: string | null
          paid?: number
          period?: string | null
          school_id: string
          status?: string
          structure_id?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          discount?: number
          due_date?: string | null
          fine?: number
          id?: string
          notes?: string | null
          paid?: number
          period?: string | null
          school_id?: string
          status?: string
          structure_id?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_ledger_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_ledger_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_ledger_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_ledger_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_date: string | null
          blood_group: string | null
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          gender: string | null
          guardian_name: string | null
          id: string
          is_active: boolean
          optional_subject: string | null
          group_subjects: string | null
          phone: string | null
          photo: string | null
          roll: string | null
          school_id: string
          section_id: string | null
          student_id: string | null
          student_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          admission_date?: string | null
          blood_group?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          guardian_name?: string | null
          id?: string
          is_active?: boolean
          optional_subject?: string | null
          group_subjects?: string | null
          phone?: string | null
          photo?: string | null
          roll?: string | null
          school_id: string
          section_id?: string | null
          student_id?: string | null
          student_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          admission_date?: string | null
          blood_group?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          guardian_name?: string | null
          id?: string
          is_active?: boolean
          optional_subject?: string | null
          group_subjects?: string | null
          phone?: string | null
          photo?: string | null
          roll?: string | null
          school_id?: string
          section_id?: string | null
          student_id?: string | null
          student_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_setups: {
        Row: {
          class_group: string
          classes: string[]
          cq_pass: number
          cq_total: number
          created_at: string
          ct_enabled: boolean
          ct_total: number
          full_marks: number
          id: string
          is_optional: boolean
          mcq_pass: number
          mcq_total: number
          mt_enabled: boolean
          mt_total: number
          practical_enabled: boolean
          practical_pass: number
          practical_total: number
          school_id: string
          sections: string[]
          subject_name: string
          updated_at: string
        }
        Insert: {
          class_group?: string
          classes?: string[]
          cq_pass?: number
          cq_total?: number
          created_at?: string
          ct_enabled?: boolean
          ct_total?: number
          full_marks?: number
          id?: string
          is_optional?: boolean
          mcq_pass?: number
          mcq_total?: number
          mt_enabled?: boolean
          mt_total?: number
          practical_enabled?: boolean
          practical_pass?: number
          practical_total?: number
          school_id: string
          sections?: string[]
          subject_name: string
          updated_at?: string
        }
        Update: {
          class_group?: string
          classes?: string[]
          cq_pass?: number
          cq_total?: number
          created_at?: string
          ct_enabled?: boolean
          ct_total?: number
          full_marks?: number
          id?: string
          is_optional?: boolean
          mcq_pass?: number
          mcq_total?: number
          mt_enabled?: boolean
          mt_total?: number
          practical_enabled?: boolean
          practical_pass?: number
          practical_total?: number
          school_id?: string
          sections?: string[]
          subject_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_setups_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          school_id: string
          subject_code: string | null
          subject_name: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          school_id: string
          subject_code?: string | null
          subject_name: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          school_id?: string
          subject_code?: string | null
          subject_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          academic_year: number
          class_id: string | null
          created_at: string
          id: string
          school_id: string
          section_id: string | null
          teacher_id: string
        }
        Insert: {
          academic_year?: number
          class_id?: string | null
          created_at?: string
          id?: string
          school_id: string
          section_id?: string | null
          teacher_id: string
        }
        Update: {
          academic_year?: number
          class_id?: string | null
          created_at?: string
          id?: string
          school_id?: string
          section_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_by: string | null
          school_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          address: string | null
          attendance_scope_staff: boolean
          attendance_scope_students: boolean
          attendance_scope_teachers: boolean
          blood_group: string | null
          can_add_students: boolean
          can_edit_students: boolean
          can_entry_results: boolean
          can_manage_attendance: boolean
          can_manage_classes: boolean
          can_manage_homework: boolean
          can_manage_payments: boolean
          can_manage_settings: boolean
          can_send_notices: boolean
          can_use_ai_tools: boolean
          can_view_reports: boolean
          created_at: string
          designation: string | null
          email: string | null
          id: string
          is_active: boolean
          joining_date: string | null
          phone: string | null
          photo: string | null
          school_id: string
          subject: string | null
          teacher_id_number: string | null
          teacher_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          attendance_scope_staff?: boolean
          attendance_scope_students?: boolean
          attendance_scope_teachers?: boolean
          blood_group?: string | null
          can_add_students?: boolean
          can_edit_students?: boolean
          can_entry_results?: boolean
          can_manage_attendance?: boolean
          can_manage_classes?: boolean
          can_manage_homework?: boolean
          can_manage_payments?: boolean
          can_manage_settings?: boolean
          can_send_notices?: boolean
          can_use_ai_tools?: boolean
          can_view_reports?: boolean
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          joining_date?: string | null
          phone?: string | null
          photo?: string | null
          school_id: string
          subject?: string | null
          teacher_id_number?: string | null
          teacher_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          attendance_scope_staff?: boolean
          attendance_scope_students?: boolean
          attendance_scope_teachers?: boolean
          blood_group?: string | null
          can_add_students?: boolean
          can_edit_students?: boolean
          can_entry_results?: boolean
          can_manage_attendance?: boolean
          can_manage_classes?: boolean
          can_manage_homework?: boolean
          can_manage_payments?: boolean
          can_manage_settings?: boolean
          can_send_notices?: boolean
          can_use_ai_tools?: boolean
          can_view_reports?: boolean
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          joining_date?: string | null
          phone?: string | null
          photo?: string | null
          school_id?: string
          subject?: string | null
          teacher_id_number?: string | null
          teacher_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_account_delta: {
        Args: { _account: string; _delta: number }
        Returns: undefined
      }
      can_manage_finance: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_gateways: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_finance: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      get_school_info_safe: {
        Args: { _school_id: string }
        Returns: {
          bank_details: string
          bkash_merchant: string
          default_version: string
          eiin: string
          established_year: number
          id: string
          is_active: boolean
          max_students: number
          max_teachers: number
          mobile_banking_number: string
          nagad_merchant: string
          plan_name: string
          principal_name: string
          principal_signature: string
          registrar_signature: string
          school_address: string
          school_code: string
          school_email: string
          school_logo: string
          school_name: string
          school_phone: string
          sslcommerz_store_id: string
          student_login_enabled: boolean
          teacher_login_enabled: boolean
          website: string
        }[]
      }
      get_student_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_user_school_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_school: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _school_id: string
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "master_admin"
        | "school_admin"
        | "sub_admin"
        | "teacher"
        | "student"
        | "accounts"
      attendance_status: "present" | "absent" | "late"
      payment_method:
        | "bkash"
        | "nagad"
        | "bank_transfer"
        | "cash"
        | "mobile_banking"
      payment_status: "pending" | "verified" | "rejected"
      shift_type: "morning" | "day" | "evening"
      version_type: "bangla" | "english"
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
    Enums: {
      app_role: [
        "master_admin",
        "school_admin",
        "sub_admin",
        "teacher",
        "student",
        "accounts",
      ],
      attendance_status: ["present", "absent", "late"],
      payment_method: [
        "bkash",
        "nagad",
        "bank_transfer",
        "cash",
        "mobile_banking",
      ],
      payment_status: ["pending", "verified", "rejected"],
      shift_type: ["morning", "day", "evening"],
      version_type: ["bangla", "english"],
    },
  },
} as const
