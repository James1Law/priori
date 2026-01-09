import { createClient } from '@supabase/supabase-js'
import type { Session, Item, Score } from '../types/database'

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: Session
        Insert: Omit<Session, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Session, 'id' | 'created_at' | 'updated_at'>>
      }
      items: {
        Row: Item
        Insert: Omit<Item, 'id' | 'created_at'>
        Update: Partial<Omit<Item, 'id' | 'created_at'>>
      }
      scores: {
        Row: Score
        Insert: Omit<Score, 'id'>
        Update: Partial<Omit<Score, 'id'>>
      }
    }
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// In test environment, use dummy values to prevent errors
const isTest = import.meta.env.MODE === 'test'

if (!supabaseUrl || !supabaseAnonKey) {
  if (!isTest) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env file.'
    )
  }
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://test.supabase.co',
  supabaseAnonKey || 'test-key'
)
