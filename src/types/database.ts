export type Framework = 'rice' | 'ice' | 'value_effort' | 'moscow' | 'weighted'

// Legacy view modes (kept for backwards compatibility with old sessions)
export type LegacyViewMode = 'scoring' | 'estimates' | 'backlog' | 'roadmap'

// New backlog-centric view modes
export type ViewMode = 'list' | 'roadmap' | 'capacity'

export type ItemStatus = 'todo' | 'in_progress' | 'done'

export type CutoffColor = 'red' | 'amber' | 'blue' | 'green'

// Hierarchy levels
export type ItemLevel = 0 | 1 | 2 | 3 | 4

export const ITEM_LEVEL_LABELS: Record<ItemLevel, string> = {
  0: 'Goal',
  1: 'Initiative',
  2: 'Epic',
  3: 'Story',
  4: 'Subtask',
}

export const ITEM_LEVEL_CHILD_LABELS: Record<ItemLevel, string> = {
  0: 'initiative',
  1: 'epic',
  2: 'story',
  3: 'subtask',
  4: 'subtask', // level 4 can't have children, but included for completeness
}

export const MAX_ITEM_LEVEL: ItemLevel = 4

export interface Session {
  id: string
  slug: string
  name: string | null
  framework: Framework
  view: ViewMode
  weighted_criteria?: WeightedCriterionData[]
  cutoff_position: number | null
  cutoff_label: string | null
  // Planning Poker state
  current_estimation_item_id: string | null
  estimation_revealed: boolean
  estimation_item_ids: string[] // Array of item IDs selected for estimation
  estimation_host: string | null // Participant name of the estimation host
  estimation_session_id: string | null // Unique ID per estimation round
  // Capacity planning settings
  capacity_team_size: number
  capacity_working_days: number
  capacity_focus_factor: number
  capacity_contingency: number
  capacity_unit: 'days' | 'hours'
  capacity_hours_per_day: number
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
  status: ItemStatus
  created_by: string | null
  created_at: string
  // Legacy period-based positioning (kept for backward compatibility)
  roadmap_start_period: string | null
  roadmap_end_period: string | null
  // New quadrant-based positioning (each period = 4 quadrants)
  roadmap_start_quadrant: number | null
  roadmap_end_quadrant: number | null
  roadmap_row: number
  // Planning Poker estimate
  story_points: number | null
  // Capacity planning estimate
  effort_estimate: number | null
  // Hierarchy
  parent_item_id: string | null
  item_level: ItemLevel
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

export interface ItemWithChildren extends ItemWithScore {
  children: ItemWithChildren[]
}

export interface Score {
  id: string
  item_id: string
  framework: string
  criteria: Record<string, unknown>
  calculated_score: number
}

export interface EstimationVote {
  id: string
  item_id: string
  session_id: string
  participant_name: string
  vote: number | null // Fibonacci value, -1 = ?, -2 = coffee, null = not voted
  created_at: string
}

export type MessageType = 'user' | 'system'

export interface Message {
  id: string
  session_id: string
  participant_name: string
  content: string
  message_type: MessageType
  created_at: string
}

export interface Cutoff {
  id: string
  session_id: string
  position: number
  label: string
  color: CutoffColor
  created_at: string
}
