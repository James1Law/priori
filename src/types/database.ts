export type Framework = 'rice' | 'ice' | 'value_effort' | 'moscow' | 'weighted'

export type ViewMode = 'scoring' | 'backlog' | 'roadmap'

export interface Session {
  id: string
  slug: string
  name: string | null
  framework: Framework
  view: ViewMode
  weighted_criteria?: WeightedCriterionData[]
  cutoff_position: number | null
  cutoff_label: string | null
  created_at: string
  updated_at: string
}

export interface WeightedCriterionData {
  id: string
  name: string
  weight: number
}

export interface Item {
  id: string
  session_id: string
  title: string
  description: string | null
  position: number
  backlog_position: number | null
  created_by: string | null
  created_at: string
  // Legacy period-based positioning (kept for backward compatibility)
  roadmap_start_period: string | null
  roadmap_end_period: string | null
  // New quadrant-based positioning (each period = 4 quadrants)
  roadmap_start_quadrant: number | null
  roadmap_end_quadrant: number | null
  roadmap_row: number
}

export interface RoadmapPeriod {
  id: string
  session_id: string
  name: string
  width: number
  position: number
  created_at: string
}

export interface ItemWithScore extends Item {
  score?: Score
}

export interface Score {
  id: string
  item_id: string
  framework: string
  criteria: Record<string, unknown>
  calculated_score: number
}
