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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_user_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blocked_user_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blocked_user_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_blocks: {
        Row: {
          blog_id: string
          content: Json
          created_at: string
          id: string
          order_index: number
          type: string
          updated_at: string
        }
        Insert: {
          blog_id: string
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          type: string
          updated_at?: string
        }
        Update: {
          blog_id?: string
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_blocks_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          blog_id: string
          content: string
          created_at: string
          id: string
          likes_count: number | null
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blog_id: string
          content: string
          created_at?: string
          id?: string
          likes_count?: number | null
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blog_id?: string
          content?: string
          created_at?: string
          id?: string
          likes_count?: number | null
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_likes: {
        Row: {
          blog_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blog_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blog_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_likes_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tag_mappings: {
        Row: {
          blog_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          blog_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          blog_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_tag_mappings_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_tag_mappings_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
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
      blogs: {
        Row: {
          category_id: string | null
          comments_count: number | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean | null
          likes_count: number | null
          published_at: string | null
          reading_time_minutes: number | null
          slug: string
          status: string
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          category_id?: string | null
          comments_count?: number | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          published_at?: string | null
          reading_time_minutes?: number | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          category_id?: string | null
          comments_count?: number | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          published_at?: string | null
          reading_time_minutes?: number | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blogs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmark_collections: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          collection_id: string | null
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "bookmark_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      businesses: {
        Row: {
          address: string | null
          business_card_url: string | null
          category_id: string | null
          cover_url: string | null
          created_at: string
          custom_category: string | null
          email: string | null
          id: string
          is_enabled: boolean
          name: string
          phone: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          business_card_url?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          custom_category?: string | null
          email?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          business_card_url?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          custom_category?: string | null
          email?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          paid_at: string | null
          payment_provider: string | null
          provider_transfer_id: string | null
          referred_user_id: string
          referrer_id: string
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          paid_at?: string | null
          payment_provider?: string | null
          provider_transfer_id?: string | null
          referred_user_id: string
          referrer_id: string
          status?: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          paid_at?: string | null
          payment_provider?: string | null
          provider_transfer_id?: string | null
          referred_user_id?: string
          referrer_id?: string
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          admin_reply: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          replied_at: string | null
          replied_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      custom_list_members: {
        Row: {
          added_at: string
          id: string
          list_id: string
          member_user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          list_id: string
          member_user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          list_id?: string
          member_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "custom_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_lists: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      event_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      event_comments: {
        Row: {
          content: string
          created_at: string
          event_id: string
          id: string
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "event_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      event_invitations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          invitee_id: string
          inviter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          invitee_id: string
          inviter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_media: {
        Row: {
          caption: string | null
          created_at: string
          event_id: string
          id: string
          media_type: string
          media_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          event_id: string
          id?: string
          media_type?: string
          media_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          event_id?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          end_date: string | null
          going_count: number | null
          group_id: string | null
          id: string
          interested_count: number | null
          latitude: number | null
          location_address: string | null
          location_name: string | null
          longitude: number | null
          privacy: string
          start_date: string
          timezone: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          cover_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          end_date?: string | null
          going_count?: number | null
          group_id?: string | null
          id?: string
          interested_count?: number | null
          latitude?: number | null
          location_address?: string | null
          location_name?: string | null
          longitude?: number | null
          privacy?: string
          start_date: string
          timezone?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          end_date?: string | null
          going_count?: number | null
          group_id?: string | null
          id?: string
          interested_count?: number | null
          latitude?: number | null
          location_address?: string | null
          location_name?: string | null
          longitude?: number | null
          privacy?: string
          start_date?: string
          timezone?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          family_member_id: string
          id: string
          relationship: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_member_id: string
          id?: string
          relationship: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_member_id?: string
          id?: string
          relationship?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      group_announcements: {
        Row: {
          content: string
          created_at: string
          expires_at: string | null
          group_id: string
          id: string
          is_active: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_announcements_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      group_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "group_post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      group_content_reports: {
        Row: {
          comment_id: string | null
          created_at: string
          description: string | null
          group_id: string
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          description?: string | null
          group_id: string
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          description?: string | null
          group_id?: string
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_content_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "group_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_content_reports_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_content_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invitations: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invitee_id: string
          inviter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invitee_id: string
          inviter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_join_requests: {
        Row: {
          created_at: string
          group_id: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "group_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          comments_count: number | null
          content: string | null
          created_at: string
          group_id: string
          id: string
          is_pinned: boolean | null
          likes_count: number | null
          media_urls: string[] | null
          pinned_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content?: string | null
          created_at?: string
          group_id: string
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          pinned_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string | null
          created_at?: string
          group_id?: string
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          pinned_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          approval_setting: string | null
          avatar_url: string | null
          category: string | null
          cover_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          member_count: number | null
          name: string
          privacy: string
          updated_at: string
        }
        Insert: {
          approval_setting?: string | null
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          member_count?: number | null
          name: string
          privacy?: string
          updated_at?: string
        }
        Update: {
          approval_setting?: string | null
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          member_count?: number | null
          name?: string
          privacy?: string
          updated_at?: string
        }
        Relationships: []
      }
      hidden_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_pages: {
        Row: {
          content: string
          id: string
          page_type: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: string
          page_type: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          page_type?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      marketplace_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          allow_pickup: boolean | null
          allow_shipping: boolean | null
          category_id: string | null
          condition: string
          contact_only: boolean | null
          created_at: string
          currency: string | null
          description: string | null
          enable_checkout: boolean | null
          expires_at: string | null
          hide_from_friends: boolean | null
          id: string
          images: string[] | null
          latitude: number | null
          location_city: string | null
          location_country: string | null
          location_region: string | null
          longitude: number | null
          price: number
          saves_count: number | null
          shipping_price: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          allow_pickup?: boolean | null
          allow_shipping?: boolean | null
          category_id?: string | null
          condition?: string
          contact_only?: boolean | null
          created_at?: string
          currency?: string | null
          description?: string | null
          enable_checkout?: boolean | null
          expires_at?: string | null
          hide_from_friends?: boolean | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          longitude?: number | null
          price?: number
          saves_count?: number | null
          shipping_price?: number | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          allow_pickup?: boolean | null
          allow_shipping?: boolean | null
          category_id?: string | null
          condition?: string
          contact_only?: boolean | null
          created_at?: string
          currency?: string | null
          description?: string | null
          enable_checkout?: boolean | null
          expires_at?: string | null
          hide_from_friends?: boolean | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          longitude?: number | null
          price?: number
          saves_count?: number | null
          shipping_price?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_offer: boolean | null
          listing_id: string
          offer_amount: number | null
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_offer?: boolean | null
          listing_id: string
          offer_amount?: number | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_offer?: boolean | null
          listing_id?: string
          offer_amount?: number | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_recently_viewed: {
        Row: {
          id: string
          listing_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_recently_viewed_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_saved_listings: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_match_games: {
        Row: {
          cards: string[]
          created_at: string
          current_turn: string
          difficulty: string | null
          id: string
          matched: string[]
          player_1: string
          player_1_score: number
          player_2: string | null
          player_2_score: number
          revealed: string[]
          status: string
          updated_at: string
          winner: string | null
        }
        Insert: {
          cards?: string[]
          created_at?: string
          current_turn: string
          difficulty?: string | null
          id?: string
          matched?: string[]
          player_1: string
          player_1_score?: number
          player_2?: string | null
          player_2_score?: number
          revealed?: string[]
          status?: string
          updated_at?: string
          winner?: string | null
        }
        Update: {
          cards?: string[]
          created_at?: string
          current_turn?: string
          difficulty?: string | null
          id?: string
          matched?: string[]
          player_1?: string
          player_1_score?: number
          player_2?: string | null
          player_2_score?: number
          revealed?: string[]
          status?: string
          updated_at?: string
          winner?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      muted_users: {
        Row: {
          created_at: string
          id: string
          muted_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          muted_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          muted_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      news_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      news_items: {
        Row: {
          category_id: string
          created_at: string
          expires_at: string
          id: string
          image_url: string | null
          published_at: string
          source_url: string | null
          summary: string | null
          title: string
        }
        Insert: {
          category_id: string
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          published_at?: string
          source_url?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          category_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          published_at?: string
          source_url?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "news_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      page_followers: {
        Row: {
          followed_at: string
          id: string
          page_id: string
          user_id: string
        }
        Insert: {
          followed_at?: string
          id?: string
          page_id: string
          user_id: string
        }
        Update: {
          followed_at?: string
          id?: string
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_followers_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          avatar_url: string | null
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          follower_count: number | null
          id: string
          is_verified: boolean | null
          name: string
          owner_id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          follower_count?: number | null
          id?: string
          is_verified?: boolean | null
          name: string
          owner_id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          follower_count?: number | null
          id?: string
          is_verified?: boolean | null
          name?: string
          owner_id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      password_reset_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          reset_token: string | null
          user_id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          reset_token?: string | null
          user_id: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          reset_token?: string | null
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      pending_commission_notifications: {
        Row: {
          amount: number
          batch_id: string | null
          created_at: string
          currency: string | null
          id: string
          notification_type: string
          payment_provider: string | null
          payout_method: string | null
          referred_user_name: string | null
          referrer_id: string
          sent_at: string | null
        }
        Insert: {
          amount: number
          batch_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          notification_type: string
          payment_provider?: string | null
          payout_method?: string | null
          referred_user_name?: string | null
          referrer_id: string
          sent_at?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          notification_type?: string
          payment_provider?: string | null
          payout_method?: string | null
          referred_user_name?: string | null
          referrer_id?: string
          sent_at?: string | null
        }
        Relationships: []
      }
      phone_verification_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      platform_photos: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      post_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_preferences: {
        Row: {
          created_at: string
          id: string
          post_id: string
          preference: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          preference: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          preference?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_preferences_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          post_id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          post_id: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          post_id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          created_at: string
          id: string
          post_id: string
          tagged_group_id: string | null
          tagged_page_id: string | null
          tagged_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          tagged_group_id?: string | null
          tagged_page_id?: string | null
          tagged_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          tagged_group_id?: string | null
          tagged_page_id?: string | null
          tagged_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tagged_group_id_fkey"
            columns: ["tagged_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tagged_page_id_fkey"
            columns: ["tagged_page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      post_topics: {
        Row: {
          created_at: string
          id: string
          post_id: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          topic_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_topics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      post_visibility_lists: {
        Row: {
          created_at: string
          id: string
          list_id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          post_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_visibility_lists_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "custom_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_visibility_lists_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string | null
          created_at: string
          id: string
          is_platform_post: boolean | null
          likes_count: number | null
          media_urls: string[] | null
          scheduled_at: string | null
          shares_count: number | null
          updated_at: string
          user_id: string
          visibility: string | null
          wall_user_id: string | null
          youtube_urls: string[] | null
        }
        Insert: {
          comments_count?: number | null
          content?: string | null
          created_at?: string
          id?: string
          is_platform_post?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          scheduled_at?: string | null
          shares_count?: number | null
          updated_at?: string
          user_id: string
          visibility?: string | null
          wall_user_id?: string | null
          youtube_urls?: string[] | null
        }
        Update: {
          comments_count?: number | null
          content?: string | null
          created_at?: string
          id?: string
          is_platform_post?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          scheduled_at?: string | null
          shares_count?: number | null
          updated_at?: string
          user_id?: string
          visibility?: string | null
          wall_user_id?: string | null
          youtube_urls?: string[] | null
        }
        Relationships: []
      }
      privacy_settings: {
        Row: {
          allow_direct_messages: boolean | null
          created_at: string
          hide_from_search: boolean | null
          id: string
          login_alerts: boolean | null
          post_visibility: string | null
          profile_visibility: string | null
          read_receipts: boolean | null
          show_last_seen: boolean | null
          show_online_status: boolean | null
          typing_indicator: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_direct_messages?: boolean | null
          created_at?: string
          hide_from_search?: boolean | null
          id?: string
          login_alerts?: boolean | null
          post_visibility?: string | null
          profile_visibility?: string | null
          read_receipts?: boolean | null
          show_last_seen?: boolean | null
          show_online_status?: boolean | null
          typing_indicator?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_direct_messages?: boolean | null
          created_at?: string
          hide_from_search?: boolean | null
          id?: string
          login_alerts?: boolean | null
          post_visibility?: string | null
          profile_visibility?: string | null
          read_receipts?: boolean | null
          show_last_seen?: boolean | null
          show_online_status?: boolean | null
          typing_indicator?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_details: {
        Row: {
          birthplace: string | null
          citizenships: string[] | null
          college: string | null
          created_at: string
          current_residence: string | null
          current_work: string | null
          full_name: string | null
          gender: string | null
          high_school: string | null
          id: string
          languages: string[] | null
          major: string | null
          relationship_status: string | null
          show_email: boolean | null
          show_phone: boolean | null
          social_network_id: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          birthplace?: string | null
          citizenships?: string[] | null
          college?: string | null
          created_at?: string
          current_residence?: string | null
          current_work?: string | null
          full_name?: string | null
          gender?: string | null
          high_school?: string | null
          id?: string
          languages?: string[] | null
          major?: string | null
          relationship_status?: string | null
          show_email?: boolean | null
          show_phone?: boolean | null
          social_network_id?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          birthplace?: string | null
          citizenships?: string[] | null
          college?: string | null
          created_at?: string
          current_residence?: string | null
          current_work?: string | null
          full_name?: string | null
          gender?: string | null
          high_school?: string | null
          id?: string
          languages?: string[] | null
          major?: string | null
          relationship_status?: string | null
          show_email?: boolean | null
          show_phone?: boolean | null
          social_network_id?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          email_verified: boolean | null
          first_name: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          is_verified: boolean | null
          last_name: string | null
          location: string | null
          onboarding_completed: boolean | null
          phone_verified: boolean | null
          referral_code: string | null
          referrer_id: string | null
          subscription_status: string | null
          terms_accepted_at: string | null
          updated_at: string
          user_id: string
          username: string | null
          username_changed: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          is_verified?: boolean | null
          last_name?: string | null
          location?: string | null
          onboarding_completed?: boolean | null
          phone_verified?: boolean | null
          referral_code?: string | null
          referrer_id?: string | null
          subscription_status?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          username_changed?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          is_verified?: boolean | null
          last_name?: string | null
          location?: string | null
          onboarding_completed?: boolean | null
          phone_verified?: boolean | null
          referral_code?: string | null
          referrer_id?: string | null
          subscription_status?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          username_changed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles_private: {
        Row: {
          birthday: string | null
          created_at: string
          email: string | null
          id: string
          payout_setup_completed: boolean | null
          paypal_customer_id: string | null
          paypal_payout_email: string | null
          phone: string | null
          signup_ip_address: string | null
          stripe_connect_id: string | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          id?: string
          payout_setup_completed?: boolean | null
          paypal_customer_id?: string | null
          paypal_payout_email?: string | null
          phone?: string | null
          signup_ip_address?: string | null
          stripe_connect_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          id?: string
          payout_setup_completed?: boolean | null
          paypal_customer_id?: string | null
          paypal_payout_email?: string | null
          phone?: string | null
          signup_ip_address?: string | null
          stripe_connect_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_platform_photos: {
        Row: {
          created_at: string
          id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_platform_photos_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "platform_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_sidebar_galleries: {
        Row: {
          author_avatar_url: string | null
          author_display_name: string | null
          author_username: string | null
          created_at: string
          id: string
          media_urls: string[]
          post_id: string
          user_id: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_display_name?: string | null
          author_username?: string | null
          created_at?: string
          id?: string
          media_urls: string[]
          post_id: string
          user_id: string
        }
        Update: {
          author_avatar_url?: string | null
          author_display_name?: string | null
          author_username?: string | null
          created_at?: string
          id?: string
          media_urls?: string[]
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_sidebar_galleries_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_birthday_wishes: {
        Row: {
          created_at: string
          friend_user_id: string
          id: string
          message: string
          posted_post_id: string | null
          scheduled_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_user_id: string
          id?: string
          message: string
          posted_post_id?: string | null
          scheduled_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_user_id?: string
          id?: string
          message?: string
          posted_post_id?: string | null
          scheduled_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          id: string
          keywords: string[] | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          page_path: string
          robots: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          page_path: string
          robots?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          page_path?: string
          robots?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      stories: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          media_type: string | null
          media_url: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string | null
          media_url: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string | null
          media_url?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          canceled_at: string | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          payment_provider: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          canceled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          canceled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sudoku_games: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          is_multiplayer: boolean | null
          player_1: string
          player_1_hints_used: number | null
          player_1_state: Json | null
          player_1_time: number | null
          player_2: string | null
          player_2_hints_used: number | null
          player_2_state: Json | null
          player_2_time: number | null
          puzzle: Json
          solution: Json
          status: string
          updated_at: string
          winner: string | null
        }
        Insert: {
          created_at?: string
          difficulty?: string
          id?: string
          is_multiplayer?: boolean | null
          player_1: string
          player_1_hints_used?: number | null
          player_1_state?: Json | null
          player_1_time?: number | null
          player_2?: string | null
          player_2_hints_used?: number | null
          player_2_state?: Json | null
          player_2_time?: number | null
          puzzle: Json
          solution: Json
          status?: string
          updated_at?: string
          winner?: string | null
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          is_multiplayer?: boolean | null
          player_1?: string
          player_1_hints_used?: number | null
          player_1_state?: Json | null
          player_1_time?: number | null
          player_2?: string | null
          player_2_hints_used?: number | null
          player_2_state?: Json | null
          player_2_time?: number | null
          puzzle?: Json
          solution?: Json
          status?: string
          updated_at?: string
          winner?: string | null
        }
        Relationships: []
      }
      sudoku_stats: {
        Row: {
          created_at: string
          easy_best_time: number | null
          easy_games_won: number | null
          expert_best_time: number | null
          expert_games_won: number | null
          hard_best_time: number | null
          hard_games_won: number | null
          id: string
          medium_best_time: number | null
          medium_games_won: number | null
          multiplayer_losses: number | null
          multiplayer_wins: number | null
          total_games_played: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          easy_best_time?: number | null
          easy_games_won?: number | null
          expert_best_time?: number | null
          expert_games_won?: number | null
          hard_best_time?: number | null
          hard_games_won?: number | null
          id?: string
          medium_best_time?: number | null
          medium_games_won?: number | null
          multiplayer_losses?: number | null
          multiplayer_wins?: number | null
          total_games_played?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          easy_best_time?: number | null
          easy_games_won?: number | null
          expert_best_time?: number | null
          expert_games_won?: number | null
          hard_best_time?: number | null
          hard_games_won?: number | null
          id?: string
          medium_best_time?: number | null
          medium_games_won?: number | null
          multiplayer_losses?: number | null
          multiplayer_wins?: number | null
          total_games_played?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      template_themes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          preview_image_url: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          preview_image_url?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          preview_image_url?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tetris_high_scores: {
        Row: {
          created_at: string
          difficulty: string
          game_mode: string
          id: string
          level: number
          lines_cleared: number
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          game_mode?: string
          id?: string
          level?: number
          lines_cleared?: number
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          game_mode?: string
          id?: string
          level?: number
          lines_cleared?: number
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      tetris_stats: {
        Row: {
          ai_losses: number
          ai_wins: number
          best_level: number
          best_score: number
          created_at: string
          games_played: number
          id: string
          total_lines_cleared: number
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_losses?: number
          ai_wins?: number
          best_level?: number
          best_score?: number
          created_at?: string
          games_played?: number
          id?: string
          total_lines_cleared?: number
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_losses?: number
          ai_wins?: number
          best_level?: number
          best_score?: number
          created_at?: string
          games_played?: number
          id?: string
          total_lines_cleared?: number
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tic_tac_toe_games: {
        Row: {
          board: string[]
          created_at: string
          current_turn: string
          id: string
          player_o: string | null
          player_x: string
          status: string
          updated_at: string
          winner: string | null
        }
        Insert: {
          board?: string[]
          created_at?: string
          current_turn?: string
          id?: string
          player_o?: string | null
          player_x: string
          status?: string
          updated_at?: string
          winner?: string | null
        }
        Update: {
          board?: string[]
          created_at?: string
          current_turn?: string
          id?: string
          player_o?: string | null
          player_x?: string
          status?: string
          updated_at?: string
          winner?: string | null
        }
        Relationships: []
      }
      tiktok_video_groups: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tiktok_videos: {
        Row: {
          author_name: string | null
          created_at: string
          group_id: string
          id: string
          sort_order: number
          thumbnail_url: string | null
          tiktok_url: string
          tiktok_video_id: string | null
          video_title: string | null
        }
        Insert: {
          author_name?: string | null
          created_at?: string
          group_id: string
          id?: string
          sort_order?: number
          thumbnail_url?: string | null
          tiktok_url: string
          tiktok_video_id?: string | null
          video_title?: string | null
        }
        Update: {
          author_name?: string | null
          created_at?: string
          group_id?: string
          id?: string
          sort_order?: number
          thumbnail_url?: string | null
          tiktok_url?: string
          tiktok_video_id?: string | null
          video_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_videos_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tiktok_video_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          follower_count: number | null
          icon: string | null
          id: string
          is_trending: boolean | null
          name: string
          post_count: number | null
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          follower_count?: number | null
          icon?: string | null
          id?: string
          is_trending?: boolean | null
          name: string
          post_count?: number | null
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          follower_count?: number | null
          icon?: string | null
          id?: string
          is_trending?: boolean | null
          name?: string
          post_count?: number | null
          slug?: string
        }
        Relationships: []
      }
      user_custom_news_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          keywords: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          keywords: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          keywords?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_custom_news_items: {
        Row: {
          created_at: string
          custom_category_id: string
          expires_at: string
          id: string
          image_url: string | null
          published_at: string
          source_url: string | null
          summary: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_category_id: string
          expires_at: string
          id?: string
          image_url?: string | null
          published_at?: string
          source_url?: string | null
          summary?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_category_id?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          published_at?: string
          source_url?: string | null
          summary?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_news_items_custom_category_id_fkey"
            columns: ["custom_category_id"]
            isOneToOne: false
            referencedRelation: "user_custom_news_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          favorite_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          favorite_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          favorite_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          followed_at: string
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          followed_at?: string
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          followed_at?: string
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_news_preferences: {
        Row: {
          category_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_news_preferences_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "news_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          created_at: string
          is_online: boolean
          last_seen_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_online?: boolean
          last_seen_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_online?: boolean
          last_seen_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          birthday_reminders: boolean | null
          compact_mode: boolean | null
          created_at: string
          dark_mode: boolean | null
          email_notifications: boolean | null
          friend_request_notifications: boolean | null
          id: string
          language: string | null
          message_sound: boolean | null
          notification_sound: boolean | null
          push_notifications: boolean | null
          selected_theme_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday_reminders?: boolean | null
          compact_mode?: boolean | null
          created_at?: string
          dark_mode?: boolean | null
          email_notifications?: boolean | null
          friend_request_notifications?: boolean | null
          id?: string
          language?: string | null
          message_sound?: boolean | null
          notification_sound?: boolean | null
          push_notifications?: boolean | null
          selected_theme_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday_reminders?: boolean | null
          compact_mode?: boolean | null
          created_at?: string
          dark_mode?: boolean | null
          email_notifications?: boolean | null
          friend_request_notifications?: boolean | null
          id?: string
          language?: string | null
          message_sound?: boolean | null
          notification_sound?: boolean | null
          push_notifications?: boolean | null
          selected_theme_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_selected_theme_id_fkey"
            columns: ["selected_theme_id"]
            isOneToOne: false
            referencedRelation: "template_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      viewed_youtube_videos: {
        Row: {
          id: string
          user_id: string
          video_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string | null
          id: string
          payout_email: string | null
          payout_method: string | null
          processed_at: string | null
          processed_by: string | null
          provider_payout_id: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          payout_email?: string | null
          payout_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider_payout_id?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          payout_email?: string | null
          payout_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider_payout_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      safe_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          email_verified: boolean | null
          first_name: string | null
          id: string | null
          is_verified: boolean | null
          last_name: string | null
          location: string | null
          phone_verified: boolean | null
          referral_code: string | null
          referrer_id: string | null
          subscription_status: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          username_changed: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email_verified?: never
          first_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          last_name?: string | null
          location?: string | null
          phone_verified?: never
          referral_code?: never
          referrer_id?: never
          subscription_status?: never
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          username_changed?: never
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email_verified?: never
          first_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          last_name?: string | null
          location?: string | null
          phone_verified?: never
          referral_code?: never
          referrer_id?: never
          subscription_status?: never
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          username_changed?: never
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          amount: number | null
          canceled_at: string | null
          created_at: string | null
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          canceled_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          canceled_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      are_friends: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      cleanup_news_items: { Args: never; Returns: undefined }
      generate_unique_username: {
        Args: { p_first_name: string; p_last_name: string; p_user_id: string }
        Returns: string
      }
      get_friend_profile: {
        Args: { friend_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          cover_url: string
          created_at: string
          display_name: string
          is_verified: boolean
          location: string
          user_id: string
          username: string
        }[]
      }
      get_friend_profiles: {
        Args: { friend_user_ids: string[] }
        Returns: {
          avatar_url: string
          bio: string
          cover_url: string
          created_at: string
          display_name: string
          is_verified: boolean
          location: string
          user_id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
