export type Framework = 'rice' | 'ice' | 'value_effort' | 'moscow' | 'weighted'

export interface Session {
  id: string
  slug: string
  name: string | null
  framework: Framework
  created_at: string
  updated_at: string
}

export interface Item {
  id: string
  session_id: string
  title: string
  description: string | null
  position: number
  created_at: string
}

export interface Score {
  id: string
  item_id: string
  framework: string
  criteria: Record<string, unknown>
  calculated_score: number
}
