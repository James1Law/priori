import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Session, Item, ItemWithScore, Score, Framework, ItemLevel } from '../types/database'
import type { WeightedCriterionData } from '../types/database'
import { ITEM_LEVEL_LABELS } from '../types/database'
import { calculateRiceScore } from '../lib/rice'
import { calculateIceScore } from '../lib/ice'
import { calculateWeightedScore } from '../lib/weighted'
import { buildTree, flattenTree, getRolledUpScore, hasChildren as hasChildrenFn } from '../lib/hierarchy'
import WeightedCriteriaEditor from '../components/WeightedCriteriaEditor'
import type { WeightedCriterion } from '../lib/weighted'

// ── Framework Configuration ──

interface CriterionConfig {
  key: string
  label: string
  color: string
  maxPips: number
}

interface FrameworkConfig {
  label: string
  scoreLabel: string
  criteria: CriterionConfig[]
  calcScore: (criteria: Record<string, unknown>) => number
}

const RICE_CONFIG: FrameworkConfig = {
  label: 'RICE',
  scoreLabel: 'RICE Score',
  criteria: [
    { key: 'reach', label: 'Reach', color: '#22c55e', maxPips: 5 },
    { key: 'impact', label: 'Impact', color: '#3b82f6', maxPips: 5 },
    { key: 'confidence', label: 'Confidence', color: '#8b5cf6', maxPips: 4 },
    { key: 'effort', label: 'Effort', color: '#f43f5e', maxPips: 4 },
  ],
  calcScore: (c) => {
    const reach = (c.reach as number) || 0
    const impact = (c.impact as number) || 0
    const confidence = (c.confidence as number) || 0
    const effort = (c.effort as number) || 0
    if (!reach && !impact && !confidence) return 0
    return calculateRiceScore({ reach, impact, confidence, effort: Math.max(effort, 1) })
  },
}

const ICE_CONFIG: FrameworkConfig = {
  label: 'ICE',
  scoreLabel: 'ICE Score',
  criteria: [
    { key: 'impact', label: 'Impact', color: '#3b82f6', maxPips: 10 },
    { key: 'confidence', label: 'Confidence', color: '#8b5cf6', maxPips: 10 },
    { key: 'ease', label: 'Ease', color: '#22c55e', maxPips: 10 },
  ],
  calcScore: (c) => {
    const impact = (c.impact as number) || 0
    const confidence = (c.confidence as number) || 0
    const ease = (c.ease as number) || 0
    if (!impact && !confidence && !ease) return 0
    return calculateIceScore({ impact, confidence, ease })
  },
}

const MOSCOW_CONFIG: FrameworkConfig = {
  label: 'MoSCoW',
  scoreLabel: 'Priority',
  criteria: [
    { key: 'category', label: 'Category', color: '#4f46e5', maxPips: 0 },
  ],
  calcScore: (c) => {
    const order: Record<string, number> = { must: 4, should: 3, could: 2, wont: 1 }
    return order[(c.category as string) || ''] || 0
  },
}

function getWeightedConfig(weightedCriteria: WeightedCriterionData[]): FrameworkConfig {
  const colors = ['#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#f43f5e', '#06b6d4', '#ec4899', '#84cc16']
  return {
    label: 'Weighted',
    scoreLabel: 'Weighted Score',
    criteria: weightedCriteria.map((wc, i) => ({
      key: wc.id,
      label: wc.name || `Criterion ${i + 1}`,
      color: colors[i % colors.length],
      maxPips: 10,
    })),
    calcScore: (c) => {
      const scores = (c.scores as Record<string, number>) || {}
      return calculateWeightedScore(weightedCriteria, scores)
    },
  }
}

function getFrameworkConfig(framework: Framework, weightedCriteria?: WeightedCriterionData[]): FrameworkConfig {
  switch (framework) {
    case 'rice': return RICE_CONFIG
    case 'ice': return ICE_CONFIG
    case 'moscow': return MOSCOW_CONFIG
    case 'weighted': return getWeightedConfig(weightedCriteria || [])
    default: return RICE_CONFIG
  }
}

const SUPPORTED_FRAMEWORKS: { value: Framework; label: string }[] = [
  { value: 'rice', label: 'RICE' },
  { value: 'ice', label: 'ICE' },
  { value: 'moscow', label: 'MoSCoW' },
  { value: 'weighted', label: 'Weighted' },
]

// ── Helper Components ──

function ScoreBadge({ score, framework }: { score: number; framework: Framework }) {
  let colorClass = 'bg-gray-100 text-gray-400 border-gray-200'
  if (score > 0) {
    if (framework === 'rice') {
      colorClass = score >= 20 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : score >= 8 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
    } else if (framework === 'moscow') {
      colorClass = score >= 3 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : score >= 2 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
    } else {
      colorClass = score >= 7 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : score >= 4 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
    }
  }
  return (
    <span className={`inline-flex items-center justify-center min-w-[52px] px-3 py-1 rounded-lg text-sm font-bold border ${colorClass}`}>
      {score > 0 ? score : '—'}
    </span>
  )
}

function RankBadge({ rank }: { rank: number }) {
  let colorClass = 'bg-gray-100 text-gray-400'
  if (rank === 1) colorClass = 'bg-amber-100 text-amber-800'
  else if (rank === 2) colorClass = 'bg-gray-200 text-gray-600'
  else if (rank === 3) colorClass = 'bg-orange-100 text-orange-700'
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold ${colorClass}`}>
      {rank}
    </span>
  )
}

function PipControl({
  value,
  maxPips,
  color,
  onChange,
}: {
  value: number
  maxPips: number
  color: string
  onChange: (val: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      {Array.from({ length: maxPips }, (_, i) => {
        const pipVal = i + 1
        const filled = pipVal <= value
        return (
          <button
            key={pipVal}
            onClick={() => onChange(pipVal === value ? 0 : pipVal)}
            className="w-2.5 h-2.5 rounded-full border-2 transition-all hover:scale-125"
            style={{
              borderColor: filled ? 'transparent' : '#d1d5db',
              backgroundColor: filled ? color : 'white',
            }}
            title={`${pipVal}`}
            aria-label={`Set to ${pipVal}`}
          />
        )
      })}
    </div>
  )
}

const MOSCOW_OPTIONS = [
  { value: 'must', label: 'Must', color: '#059669', bg: '#ecfdf5' },
  { value: 'should', label: 'Should', color: '#3b82f6', bg: '#eff6ff' },
  { value: 'could', label: 'Could', color: '#d97706', bg: '#fffbeb' },
  { value: 'wont', label: "Won't", color: '#9ca3af', bg: '#f3f4f6' },
]

function MoscowSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const option = MOSCOW_OPTIONS.find(o => o.value === value)
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs font-semibold rounded-md border px-2 py-1 cursor-pointer"
      style={{
        color: option?.color || '#9ca3af',
        backgroundColor: option?.bg || '#f3f4f6',
        borderColor: option ? `${option.color}30` : '#e5e7eb',
      }}
      data-testid="moscow-select"
    >
      <option value="">Select...</option>
      {MOSCOW_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-indigo-50 text-indigo-600',
    done: 'bg-emerald-50 text-emerald-600',
  }
  const labels: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${styles[status] || styles.todo}`}>
      {labels[status] || status}
    </span>
  )
}

// ── Main Component ──

export default function PrioritisationPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [items, setItems] = useState<ItemWithScore[]>([])
  const [loading, setLoading] = useState(true)


  // ── Data fetching ──

  const fetchData = useCallback(async () => {
    if (!slug) { navigate('/'); return }

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('slug', slug)
        .single()

      if (sessionError) {
        console.error(sessionError.code === 'PGRST116' ? 'Session not found' : 'Failed to load session')
        return
      }

      const sess = sessionData as Session
      setSession(sess)

      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('session_id', sess.id)
        .order('position', { ascending: true })

      if (itemsError) throw itemsError

      const rawItems = (itemsData as Item[]) || []

      // Fetch scores for the current framework
      if (rawItems.length > 0 && sess.framework) {
        const { data: scoresData } = await supabase
          .from('scores')
          .select('*')
          .in('item_id', rawItems.map(i => i.id))
          .eq('framework', sess.framework)

        const scores = (scoresData as Score[]) || []
        setItems(rawItems.map(item => ({
          ...item,
          score: scores.find(s => s.item_id === item.id),
        })))
      } else {
        setItems(rawItems)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      console.error('Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [slug, navigate])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Framework change ──

  const handleFrameworkChange = async (fw: Framework) => {
    if (!session || fw === session.framework) return

    // Update session framework
    const { error } = await supabase
      .from('sessions')
      .update({ framework: fw } as never)
      .eq('id', session.id)

    if (error) {
      console.error('Error updating framework:', error)
      return
    }

    setSession(prev => prev ? { ...prev, framework: fw } : null)

    // Re-fetch scores for new framework
    if (items.length > 0) {
      const { data: scoresData } = await supabase
        .from('scores')
        .select('*')
        .in('item_id', items.map(i => i.id))
        .eq('framework', fw)

      const scores = (scoresData as Score[]) || []
      setItems(prev => prev.map(item => ({
        ...item,
        score: scores.find(s => s.item_id === item.id),
      })))
    }
  }

  // ── Weighted criteria management ──

  const [showCriteriaEditor, setShowCriteriaEditor] = useState(false)

  const handleWeightedCriteriaChange = async (criteria: WeightedCriterion[]) => {
    if (!session) return

    const criteriaData = criteria.map(c => ({ id: c.id, name: c.name, weight: c.weight })) as WeightedCriterionData[]

    const { error } = await supabase
      .from('sessions')
      .update({ weighted_criteria: criteriaData } as never)
      .eq('id', session.id)

    if (error) {
      console.error('Error updating weighted criteria:', error)
      return
    }

    setSession(prev => prev ? { ...prev, weighted_criteria: criteriaData } : null)
  }

  // ── Inline scoring ──

  const handleCriterionChange = async (itemId: string, criterionKey: string, value: number | string) => {
    if (!session) return

    const item = items.find(i => i.id === itemId)
    if (!item) return

    const existingCriteria = (item.score?.criteria || {}) as Record<string, unknown>
    const fwConfig = getFrameworkConfig(session.framework, session.weighted_criteria)

    // Build updated criteria
    let updatedCriteria: Record<string, unknown>
    if (session.framework === 'weighted') {
      const existingScores = (existingCriteria.scores as Record<string, number>) || {}
      updatedCriteria = { scores: { ...existingScores, [criterionKey]: value } }
    } else if (session.framework === 'moscow') {
      updatedCriteria = { ...existingCriteria, category: value }
    } else {
      updatedCriteria = { ...existingCriteria, [criterionKey]: value }
    }

    const calculatedScore = fwConfig.calcScore(updatedCriteria)

    // Optimistic update
    setItems(prev => prev.map(i =>
      i.id === itemId
        ? {
            ...i,
            score: {
              ...i.score,
              id: i.score?.id || '',
              item_id: itemId,
              framework: session.framework,
              criteria: updatedCriteria,
              calculated_score: calculatedScore,
            },
          }
        : i
    ))

    // Save to database
    if (item.score?.id) {
      await supabase
        .from('scores')
        .update({ criteria: updatedCriteria, calculated_score: calculatedScore } as never)
        .eq('id', item.score.id)
    } else {
      const { data } = await supabase
        .from('scores')
        .insert([{
          item_id: itemId,
          framework: session.framework,
          criteria: updatedCriteria,
          calculated_score: calculatedScore,
        } as never])
        .select()
        .single()

      if (data) {
        setItems(prev => prev.map(i =>
          i.id === itemId ? { ...i, score: data as Score } : i
        ))
      }
    }
  }

  // ── Hierarchy + Sorted items ──

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const handleToggleExpand = useCallback((itemId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }, [])

  const fwConfig = useMemo(
    () => session ? getFrameworkConfig(session.framework, session.weighted_criteria) : RICE_CONFIG,
    [session?.framework, session?.weighted_criteria]
  )

  const displayItems = useMemo(() => {
    const tree = buildTree(items, true)

    // Sort siblings by effective score (direct for leaves, rolled-up for parents)
    const getEffectiveScore = (node: ItemWithScore): number => {
      const isParentNode = items.some(i => i.parent_item_id === node.id)
      if (isParentNode) {
        return getRolledUpScore(node.id, items).score ?? 0
      }
      return node.score?.calculated_score ?? 0
    }

    type TreeNode = ItemWithScore & { children: TreeNode[] }
    const sortByScore = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => getEffectiveScore(b) - getEffectiveScore(a))
      for (const node of nodes) {
        sortByScore(node.children)
      }
    }

    sortByScore(tree as TreeNode[])
    return flattenTree(tree, expandedIds)
  }, [items, expandedIds])

  const scoredCount = items.filter(i => i.score && i.score.calculated_score > 0).length

  // ── Criterion value getter ──

  function getCriterionValue(item: ItemWithScore, criterionKey: string): number | string {
    if (!item.score?.criteria) return 0
    const criteria = item.score.criteria as Record<string, unknown>
    if (session?.framework === 'weighted') {
      const scores = (criteria.scores as Record<string, number>) || {}
      return scores[criterionKey] || 0
    }
    if (session?.framework === 'moscow') {
      return (criteria.category as string) || ''
    }
    return (criteria[criterionKey] as number) || 0
  }

  // ── Loading / Guard states ──

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  // ── Render ──

  return (
    <>
      <div className="p-6 max-w-[1400px] mx-auto" data-testid="prioritisation-page">
        {/* Module Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-display font-bold text-gray-900">Prioritisation</h1>
            {/* Framework Selector */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5" data-testid="framework-selector">
              {SUPPORTED_FRAMEWORKS.map(fw => (
                <button
                  key={fw.value}
                  onClick={() => handleFrameworkChange(fw.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    session.framework === fw.value
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  data-testid={`framework-tab-${fw.value}`}
                >
                  {fw.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Item Count + Criteria Editor toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-400">
            {items.length} item{items.length !== 1 ? 's' : ''} · {scoredCount} scored
          </div>
          {session.framework === 'weighted' && (
            <button
              onClick={() => setShowCriteriaEditor(prev => !prev)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {showCriteriaEditor ? 'Hide' : 'Edit'} Criteria
            </button>
          )}
        </div>

        {/* Weighted criteria editor */}
        {session.framework === 'weighted' && (showCriteriaEditor || (session.weighted_criteria || []).length === 0) && (
          <WeightedCriteriaEditor
            criteria={(session.weighted_criteria || []).map(c => ({ id: c.id, name: c.name, weight: c.weight }))}
            onChange={handleWeightedCriteriaChange}
          />
        )}

        {/* Scoring Table */}
        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">No items to prioritise yet.</p>
            <button
              onClick={() => navigate(`/s/${slug}`)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Add items in Backlog
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full table-fixed" data-testid="scoring-table">
              <colgroup>
                <col style={{ width: '50px' }} />
                <col />
                <col style={{ width: '80px' }} />
                <col style={{ width: '140px' }} />
                {fwConfig.criteria.map(c => (
                  <col key={c.key} style={{ width: '140px' }} />
                ))}
              </colgroup>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">#</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Item</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-indigo-600 whitespace-nowrap">
                    {fwConfig.scoreLabel} ▼
                  </th>
                  {fwConfig.criteria.map(c => (
                    <th key={c.key} className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, idx) => {
                  const isParent = hasChildrenFn(item.id, items)
                  const isHierarchyItem = item.item_level > 0 || isParent
                  const indent = item.item_level * 1.5 // rem

                  // Score: direct for leaves, rolled-up for parents
                  let displayScore = item.score?.calculated_score || 0
                  let isRolledUp = false
                  let rolledUpMoscow: string | null = null

                  if (isParent) {
                    const rollup = getRolledUpScore(item.id, items)
                    displayScore = rollup.score ?? 0
                    rolledUpMoscow = rollup.moscowCategory
                    isRolledUp = true
                  }

                  const isScored = displayScore > 0 || (isParent && rolledUpMoscow !== null)

                  // Expand/collapse
                  const isExpanded = expandedIds.has(item.id)
                  const childCount = isParent && !isExpanded
                    ? items.filter(i => i.parent_item_id === item.id).length
                    : 0

                  // Level badge styles
                  const levelBadgeStyles: Record<number, string> = {
                    0: 'bg-pink-50 text-pink-700 border-pink-200',
                    1: 'bg-blue-50 text-blue-700 border-blue-200',
                    2: 'bg-purple-50 text-purple-700 border-purple-200',
                    3: 'bg-amber-50 text-amber-700 border-amber-200',
                    4: 'bg-slate-50 text-slate-600 border-slate-200',
                  }

                  // Accent bar colours
                  const accentColors: Record<number, string> = {
                    0: '#f472b6', 1: '#60a5fa', 2: '#a78bfa', 3: '#fbbf24', 4: '#94a3b8',
                  }

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors ${!isScored && !isParent ? 'opacity-50 hover:opacity-100' : ''}`}
                      data-testid={`scoring-row-${item.id}`}
                    >
                      <td className="px-4 py-3 text-center">
                        <RankBadge rank={idx + 1} />
                      </td>
                      <td className="py-3 pr-4" style={{ paddingLeft: `${1 + indent}rem` }}>
                        <div className="flex items-center gap-2">
                          {/* Hierarchy decorations — fixed width block */}
                          {isHierarchyItem && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <div
                                className="w-[3px] h-8 rounded-full flex-shrink-0"
                                style={{ backgroundColor: accentColors[item.item_level] || '#94a3b8' }}
                              />
                              {isParent ? (
                                <button
                                  onClick={() => handleToggleExpand(item.id)}
                                  className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
                                >
                                  <svg
                                    className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              ) : (
                                <div className="w-5" />
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${levelBadgeStyles[item.item_level] || levelBadgeStyles[4]}`}>
                                {ITEM_LEVEL_LABELS[item.item_level as ItemLevel]}
                              </span>
                            </div>
                          )}
                          {/* Item content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-gray-900 truncate">{item.title}</span>
                              {childCount > 0 && (
                                <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 rounded flex-shrink-0">{childCount}</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">{item.created_by ? `by ${item.created_by}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isRolledUp ? (
                          <span className="inline-flex items-center gap-1">
                            <ScoreBadge score={displayScore} framework={session.framework} />
                            {isScored && <span className="text-[10px] text-gray-400 italic">avg</span>}
                          </span>
                        ) : (
                          <ScoreBadge score={displayScore} framework={session.framework} />
                        )}
                      </td>
                      {fwConfig.criteria.map(c => (
                        <td key={c.key} className="px-4 py-3 text-center">
                          {isParent ? (
                            <span className="text-xs text-gray-300">—</span>
                          ) : session.framework === 'moscow' ? (
                            <MoscowSelect
                              value={getCriterionValue(item, c.key) as string}
                              onChange={(val) => handleCriterionChange(item.id, c.key, val)}
                            />
                          ) : (
                            <PipControl
                              value={getCriterionValue(item, c.key) as number}
                              maxPips={c.maxPips}
                              color={c.color}
                              onChange={(val) => handleCriterionChange(item.id, c.key, val)}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </>
  )
}
