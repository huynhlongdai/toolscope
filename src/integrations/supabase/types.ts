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
      ai_scores: {
        Row: {
          cons: string[] | null
          ease_of_use: number | null
          evaluated_at: string
          features: number | null
          id: string
          is_recommended: boolean
          overall_score: number
          performance: number | null
          pros: string[] | null
          summary: string | null
          support: number | null
          tool_id: string
          value_for_money: number | null
        }
        Insert: {
          cons?: string[] | null
          ease_of_use?: number | null
          evaluated_at?: string
          features?: number | null
          id?: string
          is_recommended?: boolean
          overall_score?: number
          performance?: number | null
          pros?: string[] | null
          summary?: string | null
          support?: number | null
          tool_id: string
          value_for_money?: number | null
        }
        Update: {
          cons?: string[] | null
          ease_of_use?: number | null
          evaluated_at?: string
          features?: number | null
          id?: string
          is_recommended?: boolean
          overall_score?: number
          performance?: number | null
          pros?: string[] | null
          summary?: string | null
          support?: number | null
          tool_id?: string
          value_for_money?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_scores_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: true
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          content: string
          created_at: string
          downvotes: number
          id: string
          is_accepted: boolean
          question_id: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          downvotes?: number
          id?: string
          is_accepted?: boolean
          question_id: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          downvotes?: number
          id?: string
          is_accepted?: boolean
          question_id?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          related_tool_ids: string[] | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          related_tool_ids?: string[] | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          related_tool_ids?: string[] | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          note: string | null
          tool_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          tool_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          tool_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      collect_items: {
        Row: {
          category_name: string | null
          collected_data: Json | null
          created_at: string
          description: string | null
          id: string
          imported_tool_id: string | null
          logo_url: string | null
          name: string
          pricing_type: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string
          source_url: string | null
          status: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          category_name?: string | null
          collected_data?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          imported_tool_id?: string | null
          logo_url?: string | null
          name: string
          pricing_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id: string
          source_url?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          category_name?: string | null
          collected_data?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          imported_tool_id?: string | null
          logo_url?: string | null
          name?: string
          pricing_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string
          source_url?: string | null
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collect_items_imported_tool_id_fkey"
            columns: ["imported_tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collect_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collect_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collect_schedules: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string
          cron_expression: string
          id: string
          is_active: boolean
          keyword: string
          last_run_at: string | null
          last_session_id: string | null
          results_total: number
          search_type: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by: string
          cron_expression?: string
          id?: string
          is_active?: boolean
          keyword: string
          last_run_at?: string | null
          last_session_id?: string | null
          results_total?: number
          search_type?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string
          cron_expression?: string
          id?: string
          is_active?: boolean
          keyword?: string
          last_run_at?: string | null
          last_session_id?: string | null
          results_total?: number
          search_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collect_schedules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collect_schedules_last_session_id_fkey"
            columns: ["last_session_id"]
            isOneToOne: false
            referencedRelation: "collect_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collect_sessions: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string
          id: string
          metadata: Json | null
          query: string
          results_count: number
          search_type: string
          status: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          metadata?: Json | null
          query: string
          results_count?: number
          search_type?: string
          status?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json | null
          query?: string
          results_count?: number
          search_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "collect_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          added_at: string
          collection_id: string
          id: string
          note: string | null
          sort_order: number
          tool_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          id?: string
          note?: string | null
          sort_order?: number
          tool_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          id?: string
          note?: string | null
          sort_order?: number
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          slug: string
          updated_at: string
          upvotes: number
          user_id: string
          view_count: number
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          slug: string
          updated_at?: string
          upvotes?: number
          user_id: string
          view_count?: number
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          slug?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          downvotes: number
          id: string
          parent_id: string | null
          tool_id: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          downvotes?: number
          id?: string
          parent_id?: string | null
          tool_id: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          downvotes?: number
          id?: string
          parent_id?: string | null
          tool_id?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          click_count: number | null
          coupon_code: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deal_price: number | null
          deal_url: string | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          downvotes: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_exclusive: boolean | null
          is_verified: boolean | null
          original_price: number | null
          starts_at: string | null
          title: string
          tool_id: string
          updated_at: string | null
          upvotes: number
        }
        Insert: {
          click_count?: number | null
          coupon_code?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_price?: number | null
          deal_url?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          downvotes?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_exclusive?: boolean | null
          is_verified?: boolean | null
          original_price?: number | null
          starts_at?: string | null
          title: string
          tool_id: string
          updated_at?: string | null
          upvotes?: number
        }
        Update: {
          click_count?: number | null
          coupon_code?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deal_price?: number | null
          deal_url?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          downvotes?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_exclusive?: boolean | null
          is_verified?: boolean | null
          original_price?: number | null
          starts_at?: string | null
          title?: string
          tool_id?: string
          updated_at?: string | null
          upvotes?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      launches: {
        Row: {
          category_id: string | null
          comment_count: number | null
          created_at: string | null
          description: string | null
          features: string[] | null
          id: string
          launch_date: string
          logo_url: string | null
          maker_comment: string | null
          maker_id: string
          pricing_type: string | null
          product_name: string | null
          screenshots: string[] | null
          status: string
          tagline: string
          tool_id: string | null
          updated_at: string | null
          upvotes: number | null
          video_url: string | null
          website_url: string | null
        }
        Insert: {
          category_id?: string | null
          comment_count?: number | null
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          launch_date?: string
          logo_url?: string | null
          maker_comment?: string | null
          maker_id: string
          pricing_type?: string | null
          product_name?: string | null
          screenshots?: string[] | null
          status?: string
          tagline: string
          tool_id?: string | null
          updated_at?: string | null
          upvotes?: number | null
          video_url?: string | null
          website_url?: string | null
        }
        Update: {
          category_id?: string | null
          comment_count?: number | null
          created_at?: string | null
          description?: string | null
          features?: string[] | null
          id?: string
          launch_date?: string
          logo_url?: string | null
          maker_comment?: string | null
          maker_id?: string
          pricing_type?: string | null
          product_name?: string | null
          screenshots?: string[] | null
          status?: string
          tagline?: string
          tool_id?: string | null
          updated_at?: string | null
          upvotes?: number | null
          video_url?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launches_maker_id_fkey"
            columns: ["maker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launches_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          id: string
          items: Json
          location: string
          name: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          items?: Json
          location: string
          name: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          items?: Json
          location?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_templates: {
        Row: {
          blocks: Json
          category: string | null
          description: string | null
          id: string
          name: string
          thumbnail_url: string | null
        }
        Insert: {
          blocks?: Json
          category?: string | null
          description?: string | null
          id?: string
          name: string
          thumbnail_url?: string | null
        }
        Update: {
          blocks?: Json
          category?: string | null
          description?: string | null
          id?: string
          name?: string
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          blocks: Json
          created_at: string | null
          id: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"] | null
          template: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          blocks?: Json
          created_at?: string | null
          id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"] | null
          template?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          blocks?: Json
          created_at?: string | null
          id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"] | null
          template?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pricing_history: {
        Row: {
          created_at: string
          currency: string | null
          details: Json | null
          id: string
          plan_name: string | null
          price_amount: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          recorded_at: string
          tool_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          details?: Json | null
          id?: string
          plan_name?: string | null
          price_amount?: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          recorded_at?: string
          tool_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          details?: Json | null
          id?: string
          plan_name?: string | null
          price_amount?: number | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          recorded_at?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_history_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_banned: boolean | null
          reputation_score: number
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_banned?: boolean | null
          reputation_score?: number
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_banned?: boolean | null
          reputation_score?: number
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer_count: number
          content: string | null
          created_at: string
          downvotes: number
          id: string
          is_resolved: boolean
          title: string
          tool_id: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          answer_count?: number
          content?: string | null
          created_at?: string
          downvotes?: number
          id?: string
          is_resolved?: boolean
          title: string
          tool_id: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          answer_count?: number
          content?: string | null
          created_at?: string
          downvotes?: number
          id?: string
          is_resolved?: boolean
          title?: string
          tool_id?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          score: number
          tool_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          score: number
          tool_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number
          tool_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          cons: string | null
          content: string
          created_at: string
          customer_support: number | null
          downvotes: number
          ease_of_use: number | null
          id: string
          is_editor_review: boolean
          likelihood_to_recommend: number | null
          pros: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          tool_id: string
          updated_at: string
          upvotes: number
          use_case: string | null
          value_for_money: number | null
        }
        Insert: {
          author_id: string
          cons?: string | null
          content: string
          created_at?: string
          customer_support?: number | null
          downvotes?: number
          ease_of_use?: number | null
          id?: string
          is_editor_review?: boolean
          likelihood_to_recommend?: number | null
          pros?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          tool_id: string
          updated_at?: string
          upvotes?: number
          use_case?: string | null
          value_for_money?: number | null
        }
        Update: {
          author_id?: string
          cons?: string | null
          content?: string
          created_at?: string
          customer_support?: number | null
          downvotes?: number
          ease_of_use?: number | null
          id?: string
          is_editor_review?: boolean
          likelihood_to_recommend?: number | null
          pros?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          tool_id?: string
          updated_at?: string
          upvotes?: number
          use_case?: string | null
          value_for_money?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      search_logs: {
        Row: {
          created_at: string
          id: string
          normalized_query: string
          query: string
          results_count: number
          session_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          normalized_query: string
          query: string
          results_count?: number
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          normalized_query?: string
          query?: string
          results_count?: number
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      search_rules: {
        Row: {
          boost_category_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean
          keyword_pattern: string
          match_type: string
          pinned_tool_ids: string[] | null
          redirect_url: string | null
          updated_at: string | null
        }
        Insert: {
          boost_category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          keyword_pattern: string
          match_type?: string
          pinned_tool_ids?: string[] | null
          redirect_url?: string | null
          updated_at?: string | null
        }
        Update: {
          boost_category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          keyword_pattern?: string
          match_type?: string
          pinned_tool_ids?: string[] | null
          redirect_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_rules_boost_category_id_fkey"
            columns: ["boost_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
          tool_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          tool_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          tool_count?: number | null
        }
        Relationships: []
      }
      tool_alternatives: {
        Row: {
          alternative_id: string
          created_at: string
          id: string
          tool_id: string
          vote_count: number
        }
        Insert: {
          alternative_id: string
          created_at?: string
          id?: string
          tool_id: string
          vote_count?: number
        }
        Update: {
          alternative_id?: string
          created_at?: string
          id?: string
          tool_id?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tool_alternatives_alternative_id_fkey"
            columns: ["alternative_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_alternatives_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_screenshots: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          sort_order: number
          tool_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
          tool_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_screenshots_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_tags: {
        Row: {
          tag_id: string
          tool_id: string
        }
        Insert: {
          tag_id: string
          tool_id: string
        }
        Update: {
          tag_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_tags_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_tasks: {
        Row: {
          created_at: string | null
          id: string
          relevance_score: number | null
          task_id: string
          tool_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          relevance_score?: number | null
          task_id: string
          tool_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          relevance_score?: number | null
          task_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_tasks_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          affiliate_url: string | null
          avg_rating: number | null
          category_id: string | null
          created_at: string
          description: string | null
          detailed_content: string | null
          faq: Json | null
          features: Json | null
          id: string
          is_featured: boolean
          is_trending: boolean
          logo_url: string | null
          name: string
          platforms: string[] | null
          pricing_details: Json | null
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          rating_count: number
          related_tool_ids: string[] | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          submitted_by: string | null
          updated_at: string
          upvotes: number
          view_count: number
          website_url: string | null
        }
        Insert: {
          affiliate_url?: string | null
          avg_rating?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          detailed_content?: string | null
          faq?: Json | null
          features?: Json | null
          id?: string
          is_featured?: boolean
          is_trending?: boolean
          logo_url?: string | null
          name: string
          platforms?: string[] | null
          pricing_details?: Json | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          rating_count?: number
          related_tool_ids?: string[] | null
          short_description?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          submitted_by?: string | null
          updated_at?: string
          upvotes?: number
          view_count?: number
          website_url?: string | null
        }
        Update: {
          affiliate_url?: string | null
          avg_rating?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          detailed_content?: string | null
          faq?: Json | null
          features?: Json | null
          id?: string
          is_featured?: boolean
          is_trending?: boolean
          logo_url?: string | null
          name?: string
          platforms?: string[] | null
          pricing_details?: Json | null
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          rating_count?: number
          related_tool_ids?: string[] | null
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          submitted_by?: string | null
          updated_at?: string
          upvotes?: number
          view_count?: number
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          field_name: string
          id: string
          is_auto: boolean | null
          locale: string
          translated_text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          field_name: string
          id?: string
          is_auto?: boolean | null
          locale?: string
          translated_text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          field_name?: string
          id?: string
          is_auto?: boolean | null
          locale?: string
          translated_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_type: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_type: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_type?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_claims: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tool_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tool_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tool_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_claims_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_responses: {
        Row: {
          content: string
          created_at: string | null
          id: string
          review_id: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          review_id: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          review_id?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_responses_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
          vote: Database["public"]["Enums"]["vote_type"]
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
          vote?: Database["public"]["Enums"]["vote_type"]
        }
        Relationships: [
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          author_id: string | null
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          seo_content: Json | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"] | null
          steps: Json | null
          title: string
          tool_ids: string[] | null
          updated_at: string | null
          upvotes: number | null
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          seo_content?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"] | null
          steps?: Json | null
          title: string
          tool_ids?: string[] | null
          updated_at?: string | null
          upvotes?: number | null
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          seo_content?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"] | null
          steps?: Json | null
          title?: string
          tool_ids?: string[] | null
          updated_at?: string | null
          upvotes?: number | null
          video_url?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_deal_click: { Args: { deal_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "editor" | "user"
      content_status: "draft" | "published" | "archived" | "pending_review"
      pricing_type: "free" | "freemium" | "paid" | "open_source" | "contact"
      vote_type: "up" | "down"
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
      app_role: ["admin", "editor", "user"],
      content_status: ["draft", "published", "archived", "pending_review"],
      pricing_type: ["free", "freemium", "paid", "open_source", "contact"],
      vote_type: ["up", "down"],
    },
  },
} as const
