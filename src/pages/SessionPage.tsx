import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Session, Item, ItemWithScore, Framework, Score, WeightedCriterionData, ViewMode } from '../types/database'
import { calculateRiceScore } from '../lib/rice'
import { calculateIceScore } from '../lib/ice'
import { calculateWeightedScore, type WeightedCriterion, type WeightedItemScores } from '../lib/weighted'
import { exportToCsv } from '../lib/exportCsv'
import ItemForm from '../components/ItemForm'
import ItemList from '../components/ItemList'
import BacklogList from '../components/BacklogList'
import EstimatesView from '../components/EstimatesView'
import RoadmapMobilePlaceholder from '../components/RoadmapMobilePlaceholder'
import ItemEditModal from '../components/ItemEditModal'
import NamePromptModal from '../components/NamePromptModal'
import MobileBottomBar from '../components/MobileBottomBar'
import ConfirmModal from '../components/ConfirmModal'
import ViewTabs from '../components/ViewTabs'
import SlideInPanel from '../components/SlideInPanel'
import FAB from '../components/FAB'
import BottomSheet from '../components/BottomSheet'
import MobileMenu from '../components/MobileMenu'
import { useParticipantName } from '../hooks/useParticipantName'
import { usePresence } from '../hooks/usePresence'
import { useRoadmapPeriods } from '../hooks/useRoadmapPeriods'

// Lazy load components that are only used for specific frameworks/views
const ValueEffortMatrix = lazy(() => import('../components/ValueEffortMatrix'))
const WeightedCriteriaEditor = lazy(() => import('../components/WeightedCriteriaEditor'))
const RoadmapView = lazy(() => import('../components/RoadmapView'))

function Logo({ className = '', id = 'header-brand' }: { className?: string; id?: string }) {
  const gradientId = `${id}-gradient`
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${gradientId})`} />
      <path d="M24 12L36 34H12L24 12Z" fill="white" />
    </svg>
  )
}

export default function SessionPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [items, setItems] = useState<ItemWithScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [updatingScores, setUpdatingScores] = useState<Set<string>>(new Set())
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null)
  const [editingSessionName, setEditingSessionName] = useState(false)
  const [sessionNameInput, setSessionNameInput] = useState('')
  const [confirmModal, setConfirmModal] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: 'danger' | 'warning' | 'default'
    onConfirm: () => void
  } | null>(null)
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false)
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [notification, setNotification] = useState<{
    title: string
    message: string
  } | null>(null)
  // Local view state - stored per-participant, not synced to database
  const [localView, setLocalView] = useState<ViewMode>('scoring')
  const saveTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  // Refs to track current values for realtime callbacks (avoids stale closure)
  const frameworkRef = useRef<Framework | undefined>(session?.framework)
  const sessionIdRef = useRef<string | undefined>(session?.id)

  // Keep refs in sync with session state
  useEffect(() => {
    frameworkRef.current = session?.framework
    sessionIdRef.current = session?.id
  }, [session?.framework, session?.id])

  // Participant name and presence
  const { name: participantName, setName: setParticipantName, needsName } = useParticipantName()
  const { participants, participantCount } = usePresence(session?.id || null, participantName)

  // Roadmap periods
  const {
    periods: roadmapPeriods,
    loading: roadmapPeriodsLoading,
    addPeriod: addRoadmapPeriod,
    updatePeriod: updateRoadmapPeriod,
    deletePeriod: deleteRoadmapPeriod,
  } = useRoadmapPeriods(localView === 'roadmap' ? (session?.id ?? null) : null)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      // "N" key opens add item panel (desktop) or bottom sheet (mobile)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        // Check if we're on mobile (< lg breakpoint = 1024px)
        if (window.innerWidth < 1024) {
          setIsAddSheetOpen(true)
        } else {
          setIsAddPanelOpen(true)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Helper function to fetch items with scores
  const fetchItems = useCallback(async (sessionId: string, framework?: Framework) => {
    const { data: itemsData, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('session_id', sessionId)
      .order('position', { ascending: true })

    if (itemsError) {
      console.error('Error fetching items:', itemsError)
      return
    }

    const items = (itemsData as Item[]) || []

    // Fetch scores for all items
    if (items.length > 0 && framework) {
      const itemIds = items.map((item) => item.id)
      const { data: scoresData } = await supabase
        .from('scores')
        .select('*')
        .in('item_id', itemIds)
        .eq('framework', framework)

      const scores = (scoresData as Score[]) || []

      // Attach scores to items
      const itemsWithScores: ItemWithScore[] = items.map((item) => ({
        ...item,
        score: scores.find((s) => s.item_id === item.id),
      }))

      // Sort by score if framework is rice, ice, or weighted
      if (framework === 'rice' || framework === 'ice' || framework === 'weighted') {
        itemsWithScores.sort((a, b) => {
          const scoreA = a.score?.calculated_score || 0
          const scoreB = b.score?.calculated_score || 0
          return scoreB - scoreA // Descending order
        })
      }

      setItems(itemsWithScores)
    } else {
      setItems(items)
    }
  }, [])

  useEffect(() => {
    if (!slug) {
      navigate('/')
      return
    }

    const fetchSession = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('sessions')
          .select('*')
          .eq('slug', slug)
          .single()

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError('Session not found')
          } else {
            throw fetchError
          }
          return
        }

        const sessionData = data as Session
        // Default view to 'scoring' if not set (backwards compatibility)
        setSession({ ...sessionData, view: sessionData.view || 'scoring' })
        await fetchItems(sessionData.id, sessionData.framework)
      } catch (err) {
        console.error('Error fetching session:', err)
        setError('Failed to load session')
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [slug, navigate, fetchItems])

  // Update browser tab title when session name changes
  useEffect(() => {
    if (session) {
      document.title = session.name
        ? `${session.name} - Priori`
        : `Session ${session.slug} - Priori`
    }
    return () => {
      document.title = 'Priori'
    }
  }, [session?.name, session?.slug])

  // Real-time subscriptions for collaborative editing
  useEffect(() => {
    if (!session) return

    // Subscribe to items table changes for this session
    const itemsChannel = supabase
      .channel(`items:session_id=eq.${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'items',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const newItem = payload.new as Item
          setItems((prevItems) => {
            // Avoid duplicates (in case we added it ourselves)
            if (prevItems.some((item) => item.id === newItem.id)) {
              return prevItems
            }
            return [...prevItems, newItem]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const updatedItem = payload.new as Item
          setItems((prevItems) =>
            prevItems.map((item) =>
              item.id === updatedItem.id ? { ...item, ...updatedItem } : item
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'items',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const deletedItem = payload.old as Item
          setItems((prevItems) =>
            prevItems.filter((item) => item.id !== deletedItem.id)
          )
        }
      )
      .subscribe()

    // Subscribe to scores table changes
    const scoresChannel = supabase
      .channel(`scores:session_${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
        },
        async (payload) => {
          // For score changes, we need to check if the item belongs to this session
          const scoreData = (payload.new || payload.old) as Score
          if (!scoreData?.item_id) return

          // Use sessionIdRef to avoid stale closure
          const currentSessionId = sessionIdRef.current
          if (!currentSessionId) return

          // Check database if item exists in session
          const { data } = await supabase
            .from('items')
            .select('id')
            .eq('id', scoreData.item_id)
            .eq('session_id', currentSessionId)
            .single()
          if (!data) return

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newScore = payload.new as Score
            // Only update if framework matches (use ref to avoid stale closure)
            const currentFramework = frameworkRef.current
            if (newScore.framework !== currentFramework) return

            setItems((prevItems) => {
              // Check if this item exists in our local state
              const itemExists = prevItems.some((item) => item.id === newScore.item_id)
              if (!itemExists) return prevItems

              const updatedItems = prevItems.map((item) =>
                item.id === newScore.item_id
                  ? { ...item, score: newScore }
                  : item
              )
              // Re-sort if using a scored framework
              if (currentFramework === 'rice' || currentFramework === 'ice' || currentFramework === 'weighted') {
                updatedItems.sort((a, b) => {
                  const scoreA = a.score?.calculated_score || 0
                  const scoreB = b.score?.calculated_score || 0
                  return scoreB - scoreA
                })
              }
              return updatedItems
            })
          } else if (payload.eventType === 'DELETE') {
            const deletedScore = payload.old as Score
            setItems((prevItems) =>
              prevItems.map((item) =>
                item.id === deletedScore.item_id
                  ? { ...item, score: undefined }
                  : item
              )
            )
          }
        }
      )
      .subscribe()

    // Subscribe to session changes (framework, weighted_criteria)
    const sessionChannel = supabase
      .channel(`session:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const updatedSession = payload.new as Session
          setSession(updatedSession)
          // Refetch items if framework changed (use ref for comparison)
          if (updatedSession.framework !== frameworkRef.current) {
            fetchItems(session.id, updatedSession.framework)
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(itemsChannel)
      supabase.removeChannel(scoresChannel)
      supabase.removeChannel(sessionChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- items and session used via refs to avoid stale closures
  }, [session?.id, fetchItems])

  const handleAddItem = async (newItem: {
    title: string
    description: string
  }) => {
    if (!session) return

    const position = items.length

    const itemToInsert = {
      session_id: session.id,
      title: newItem.title,
      description: newItem.description || null,
      position,
      created_by: participantName,
    }

    const { data, error: insertError } = await supabase
      .from('items')
      .insert([itemToInsert as never])
      .select()
      .single()

    if (insertError) {
      console.error('Error adding item:', insertError)
      alert('Failed to add item. Please try again.')
      return
    }

    const newItemData = data as Item

    // Create default score for scored frameworks so sorting works correctly
    let defaultScore: Score | undefined
    if (session.framework === 'rice' || session.framework === 'ice' || session.framework === 'value_effort' || session.framework === 'weighted') {
      const defaultCriteria = getDefaultCriteria(session.framework)
      const calculatedScore = calculateScore(defaultCriteria as Record<string, number | string | WeightedItemScores>, session.framework, session.weighted_criteria)

      const { data: scoreData } = await supabase
        .from('scores')
        .insert([{
          item_id: newItemData.id,
          framework: session.framework,
          criteria: defaultCriteria,
          calculated_score: calculatedScore,
        } as never])
        .select()
        .single()

      if (scoreData) {
        defaultScore = scoreData as Score
      }
    }

    // Add to items list with score, then sort
    const newItemWithScore: ItemWithScore = { ...newItemData, score: defaultScore }
    setItems((prevItems) => {
      // Check for duplicates (realtime subscription may have already added it)
      if (prevItems.some((item) => item.id === newItemWithScore.id)) {
        // Update existing item with score instead of adding duplicate
        const updatedItems = prevItems.map((item) =>
          item.id === newItemWithScore.id ? newItemWithScore : item
        )
        // Sort if using a scored framework
        if (session.framework === 'rice' || session.framework === 'ice' || session.framework === 'weighted') {
          updatedItems.sort((a, b) => {
            const scoreA = a.score?.calculated_score || 0
            const scoreB = b.score?.calculated_score || 0
            return scoreB - scoreA
          })
        }
        return updatedItems
      }
      const updatedItems = [...prevItems, newItemWithScore]
      // Sort if using a scored framework
      if (session.framework === 'rice' || session.framework === 'ice' || session.framework === 'weighted') {
        updatedItems.sort((a, b) => {
          const scoreA = a.score?.calculated_score || 0
          const scoreB = b.score?.calculated_score || 0
          return scoreB - scoreA
        })
      }
      return updatedItems
    })
  }

  // Get default criteria for a framework
  const getDefaultCriteria = (framework: Framework): Record<string, unknown> => {
    switch (framework) {
      case 'rice':
        return { reach: 100, impact: 1, confidence: 0.8, effort: 1 }
      case 'ice':
        return { impact: 5, confidence: 5, ease: 5 }
      case 'value_effort':
        return { value: 5, effort: 5 }
      case 'weighted':
        return { scores: {} }
      case 'moscow':
        return { category: 'must' }
      default:
        return {}
    }
  }

  const handleEditItem = async (updatedItem: Item) => {
    const updates = {
      title: updatedItem.title,
      description: updatedItem.description,
    }

    const { error: updateError } = await supabase
      .from('items')
      .update(updates as never)
      .eq('id', updatedItem.id)

    if (updateError) {
      console.error('Error updating item:', updateError)
      alert('Failed to update item. Please try again.')
      return
    }

    setItems(items.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
    setEditingItem(null)
  }

  const handleDeleteItem = (itemId: string) => {
    setConfirmModal({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item?',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(null)

        const { error: deleteError } = await supabase
          .from('items')
          .delete()
          .eq('id', itemId)

        if (deleteError) {
          console.error('Error deleting item:', deleteError)
          alert('Failed to delete item. Please try again.')
          return
        }

        setItems(items.filter((item) => item.id !== itemId))
      },
    })
  }

  const handleClearItems = () => {
    if (!session) return

    setConfirmModal({
      title: 'Clear All Items',
      message: 'Are you sure you want to delete all items? This cannot be undone.',
      confirmLabel: 'Clear All',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(null)

        const { error: deleteError } = await supabase
          .from('items')
          .delete()
          .eq('session_id', session.id)

        if (deleteError) {
          console.error('Error clearing items:', deleteError)
          alert('Failed to clear items. Please try again.')
          return
        }

        // Also reset cutoff position since there are no items
        if (session.cutoff_position !== null) {
          const { error: updateError } = await supabase
            .from('sessions')
            .update({ cutoff_position: null } as never)
            .eq('id', session.id)

          if (!updateError) {
            setSession({ ...session, cutoff_position: null })
          }
        }

        setItems([])
      },
    })
  }

  const handleNewSession = async () => {
    const { generateSlug } = await import('../lib/slug')
    const slug = generateSlug()

    const { error: insertError } = await supabase
      .from('sessions')
      .insert([{ slug, framework: 'rice' } as never])

    if (insertError) {
      console.error('Error creating session:', insertError)
      alert('Failed to create new session. Please try again.')
      return
    }

    navigate(`/s/${slug}`)
  }

  const handleFrameworkChange = async (framework: Framework) => {
    if (!session) return

    const updates = { framework }

    const { error: updateError } = await supabase
      .from('sessions')
      .update(updates as never)
      .eq('id', session.id)

    if (updateError) {
      console.error('Error updating framework:', updateError)
      alert('Failed to update framework. Please try again.')
      return
    }

    setSession({ ...session, framework })

    // Create default scores for items that don't have scores in the new framework
    await createDefaultScoresForFramework(session.id, framework)

    // Fetch items with the new framework's scores
    await fetchItems(session.id, framework)
  }

  // Create default scores for all items that don't have scores in the specified framework
  const createDefaultScoresForFramework = async (sessionId: string, framework: Framework) => {
    // Get all item IDs for this session
    const { data: itemsData } = await supabase
      .from('items')
      .select('id')
      .eq('session_id', sessionId)

    if (!itemsData || itemsData.length === 0) return

    const itemIds = (itemsData as { id: string }[]).map((item) => item.id)

    // Get existing scores for this framework
    const { data: existingScores } = await supabase
      .from('scores')
      .select('item_id')
      .in('item_id', itemIds)
      .eq('framework', framework)

    const scoredItemIds = new Set((existingScores as { item_id: string }[] | null)?.map((s) => s.item_id) || [])

    // Find items without scores in this framework
    const unscoredItemIds = itemIds.filter((id) => !scoredItemIds.has(id))

    if (unscoredItemIds.length === 0) return

    // Create default scores for unscored items
    const defaultCriteria = getDefaultCriteria(framework)
    const calculatedScore = calculateScore(
      defaultCriteria as Record<string, number | string | WeightedItemScores>,
      framework,
      session?.weighted_criteria
    )

    const scoreRecords = unscoredItemIds.map((itemId) => ({
      item_id: itemId,
      framework,
      criteria: defaultCriteria,
      calculated_score: calculatedScore,
    }))

    await supabase
      .from('scores')
      .insert(scoreRecords as never)
  }

  // Initialize local view from localStorage on mount
  useEffect(() => {
    if (!slug) return
    const savedView = localStorage.getItem(`priori_view_${slug}`)
    if (savedView && ['scoring', 'estimates', 'backlog', 'roadmap'].includes(savedView)) {
      setLocalView(savedView as ViewMode)
    }
  }, [slug])

  const handleViewChange = (view: ViewMode) => {
    setLocalView(view)
    // Persist to localStorage for this session only (not synced across participants)
    if (slug) {
      localStorage.setItem(`priori_view_${slug}`, view)
    }
  }

  // Check if items are in manual order (any item has backlog_position set)
  const isManualOrder = items.some((item) => item.backlog_position !== null && item.backlog_position !== undefined)

  // Get items sorted for scoring view (always by calculated score, ignoring backlog_position)
  const scoringViewItems = [...items].sort((a, b) => {
    const scoreA = a.score?.calculated_score || 0
    const scoreB = b.score?.calculated_score || 0
    return scoreB - scoreA // Descending order
  })

  // Get items sorted for backlog view (by backlog_position if set, otherwise by score)
  const backlogViewItems = isManualOrder
    ? [...items].sort((a, b) => {
        const posA = a.backlog_position ?? Number.MAX_SAFE_INTEGER
        const posB = b.backlog_position ?? Number.MAX_SAFE_INTEGER
        return posA - posB
      })
    : [...items].sort((a, b) => {
        const scoreA = a.score?.calculated_score || 0
        const scoreB = b.score?.calculated_score || 0
        return scoreB - scoreA
      })

  const handleBacklogReorder = async (reorderedItems: ItemWithScore[]) => {
    if (!session) return

    // Optimistically update local state with new positions
    const itemsWithPositions = reorderedItems.map((item, index) => ({
      ...item,
      backlog_position: index,
    }))
    setItems(itemsWithPositions)

    // Persist to database
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      backlog_position: index,
    }))

    for (const update of updates) {
      const { error } = await supabase
        .from('items')
        .update({ backlog_position: update.backlog_position } as never)
        .eq('id', update.id)

      if (error) {
        console.error('Error updating item position:', error)
      }
    }
  }

  const handleResetBacklogOrder = async () => {
    if (!session) return

    // Reset all items to have null backlog_position
    const resetItems = items.map((item) => ({
      ...item,
      backlog_position: null,
    }))
    setItems(resetItems)

    // Persist to database
    for (const item of items) {
      const { error } = await supabase
        .from('items')
        .update({ backlog_position: null } as never)
        .eq('id', item.id)

      if (error) {
        console.error('Error resetting item position:', error)
      }
    }
  }

  const handleCutoffChange = async (position: number | null) => {
    if (!session) return

    // Optimistically update local state
    setSession({ ...session, cutoff_position: position })

    // Persist to database
    const { error } = await supabase
      .from('sessions')
      .update({ cutoff_position: position } as never)
      .eq('id', session.id)

    if (error) {
      console.error('Error updating cutoff position:', error)
      // Revert on error
      setSession({ ...session })
    }
  }

  const handleCutoffLabelChange = async (label: string) => {
    if (!session) return

    // Optimistically update local state
    setSession({ ...session, cutoff_label: label })

    // Persist to database
    const { error } = await supabase
      .from('sessions')
      .update({ cutoff_label: label } as never)
      .eq('id', session.id)

    if (error) {
      console.error('Error updating cutoff label:', error)
      // Revert on error
      setSession({ ...session })
    }
  }

  const handleScheduleItem = async (itemId: string, startQuadrant: number, endQuadrant: number) => {
    // Optimistically update local state
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? { ...item, roadmap_start_quadrant: startQuadrant, roadmap_end_quadrant: endQuadrant }
          : item
      )
    )

    // Persist to database
    const { error } = await supabase
      .from('items')
      .update({
        roadmap_start_quadrant: startQuadrant,
        roadmap_end_quadrant: endQuadrant,
      } as never)
      .eq('id', itemId)

    if (error) {
      console.error('Error scheduling item:', error)
      // Revert on error
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId
            ? { ...item, roadmap_start_quadrant: null, roadmap_end_quadrant: null }
            : item
        )
      )
    }
  }

  const handleUnscheduleItem = async (itemId: string) => {
    // Find the current item to store for potential revert
    const currentItem = items.find((item) => item.id === itemId)

    // Optimistically update local state
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? { ...item, roadmap_start_quadrant: null, roadmap_end_quadrant: null }
          : item
      )
    )

    // Persist to database
    const { error } = await supabase
      .from('items')
      .update({
        roadmap_start_quadrant: null,
        roadmap_end_quadrant: null,
      } as never)
      .eq('id', itemId)

    if (error) {
      console.error('Error unscheduling item:', error)
      // Revert on error
      if (currentItem) {
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  roadmap_start_quadrant: currentItem.roadmap_start_quadrant,
                  roadmap_end_quadrant: currentItem.roadmap_end_quadrant,
                }
              : item
          )
        )
      }
    }
  }

  const handleDeletePeriod = async (periodId: string) => {
    // Find the period being deleted and its position
    const periodToDelete = roadmapPeriods.find((p) => p.id === periodId)
    if (!periodToDelete) return

    // Calculate the quadrant range this period covers
    const QUADRANTS_PER_PERIOD = 4
    let quadrantOffset = 0
    for (const period of roadmapPeriods) {
      if (period.id === periodId) break
      quadrantOffset += QUADRANTS_PER_PERIOD
    }
    const deletedPeriodStartQuadrant = quadrantOffset
    const deletedPeriodEndQuadrant = quadrantOffset + QUADRANTS_PER_PERIOD - 1

    // Find items that overlap with this period's quadrant range
    const affectedItems = items.filter((item) => {
      if (item.roadmap_start_quadrant === null || item.roadmap_end_quadrant === null) {
        return false
      }
      // Check if item's range overlaps with the deleted period's range
      return (
        item.roadmap_start_quadrant <= deletedPeriodEndQuadrant &&
        item.roadmap_end_quadrant >= deletedPeriodStartQuadrant
      )
    })

    // Clear quadrant values for affected items (optimistically)
    if (affectedItems.length > 0) {
      setItems((prevItems) =>
        prevItems.map((item) =>
          affectedItems.some((ai) => ai.id === item.id)
            ? { ...item, roadmap_start_quadrant: null, roadmap_end_quadrant: null }
            : item
        )
      )

      // Persist to database
      for (const item of affectedItems) {
        await supabase
          .from('items')
          .update({
            roadmap_start_quadrant: null,
            roadmap_end_quadrant: null,
          } as never)
          .eq('id', item.id)
      }
    }

    // Now delete the period
    await deleteRoadmapPeriod(periodId)
  }

  const handleSessionNameSave = async () => {
    if (!session) return

    const newName = sessionNameInput.trim() || null

    const { error: updateError } = await supabase
      .from('sessions')
      .update({ name: newName } as never)
      .eq('id', session.id)

    if (updateError) {
      console.error('Error updating session name:', updateError)
      alert('Failed to update session name. Please try again.')
      return
    }

    setSession({ ...session, name: newName })
    setEditingSessionName(false)
  }

  const startEditingSessionName = () => {
    setSessionNameInput(session?.name || '')
    setEditingSessionName(true)
  }

  // Handle changing the current estimation item (for Planning Poker)
  const handleCurrentEstimationItemChange = async (itemId: string | null) => {
    if (!session) return

    // Optimistically update local state (also reset revealed state when changing items)
    setSession({ ...session, current_estimation_item_id: itemId, estimation_revealed: false })

    // Persist to database (syncs to all participants via Realtime)
    const { error } = await supabase
      .from('sessions')
      .update({ current_estimation_item_id: itemId, estimation_revealed: false } as never)
      .eq('id', session.id)

    if (error) {
      console.error('Error updating current estimation item:', error)
      // Revert on error
      setSession({ ...session })
    }
  }

  // Handle revealing votes (for Planning Poker)
  const handleRevealVotes = async () => {
    if (!session) return

    // Optimistically update local state
    setSession({ ...session, estimation_revealed: true })

    // Persist to database (syncs to all participants via Realtime)
    const { error } = await supabase
      .from('sessions')
      .update({ estimation_revealed: true } as never)
      .eq('id', session.id)

    if (error) {
      console.error('Error revealing votes:', error)
      // Revert on error
      setSession({ ...session })
    }
  }

  // Handle accepting an estimate (for Planning Poker)
  const handleAcceptEstimate = async (itemId: string, storyPoints: number) => {
    if (!session) return

    // Optimistically update local items state
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, story_points: storyPoints } : item
      )
    )

    // Save story points to database
    const { error: itemError } = await supabase
      .from('items')
      .update({ story_points: storyPoints } as never)
      .eq('id', itemId)

    if (itemError) {
      console.error('Error saving story points:', itemError)
      // Revert on error - refetch items
      return
    }

    // Clear votes for the item
    const { error: votesError } = await supabase
      .from('estimation_votes')
      .delete()
      .eq('item_id', itemId)

    if (votesError) {
      console.error('Error clearing votes:', votesError)
    }
  }

  // Handle re-voting (for Planning Poker)
  const handleRevote = async () => {
    if (!session || !session.current_estimation_item_id) return

    // Clear votes for current item
    const { error: votesError } = await supabase
      .from('estimation_votes')
      .delete()
      .eq('item_id', session.current_estimation_item_id)

    if (votesError) {
      console.error('Error clearing votes:', votesError)
    }

    // Reset revealed state
    setSession({ ...session, estimation_revealed: false })

    const { error: sessionError } = await supabase
      .from('sessions')
      .update({ estimation_revealed: false } as never)
      .eq('id', session.id)

    if (sessionError) {
      console.error('Error resetting revealed state:', sessionError)
    }
  }

  // Helper to calculate score based on framework
  const calculateScore = (scores: Record<string, number | string | WeightedItemScores>, framework: Framework, criteria?: WeightedCriterionData[]): number => {
    if (framework === 'rice') {
      return calculateRiceScore(scores as { reach: number; impact: number; confidence: number; effort: number })
    } else if (framework === 'ice') {
      return calculateIceScore(scores as { impact: number; confidence: number; ease: number })
    } else if (framework === 'value_effort') {
      // Value vs Effort doesn't use a single score - quadrant is determined by position
      return 0
    } else if (framework === 'moscow') {
      // MoSCoW doesn't use numeric scoring - it's categorical
      return 0
    } else if (framework === 'weighted') {
      // Weighted uses custom criteria and item scores
      if (!criteria || criteria.length === 0) return 0
      const itemScores = (scores as { scores: WeightedItemScores }).scores || {}
      return calculateWeightedScore(criteria as WeightedCriterion[], itemScores)
    }
    return 0
  }

  // Handle matrix item click - highlight and scroll to item
  const handleMatrixItemClick = (itemId: string) => {
    setHighlightedItemId(itemId)
    // Scroll to the item in the list
    const element = document.getElementById(`item-${itemId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    // Clear highlight after 3 seconds
    setTimeout(() => setHighlightedItemId(null), 3000)
  }

  // Actual score save function
  const saveScoreToDatabase = async (
    itemId: string,
    scores: Record<string, number | string | WeightedItemScores>
  ) => {
    if (!session) return

    const calculatedScore = calculateScore(scores, session.framework, session.weighted_criteria)

    // Check if score exists
    const existingItem = items.find((item) => item.id === itemId)
    const scoreData = {
      item_id: itemId,
      framework: session.framework,
      criteria: scores,
      calculated_score: calculatedScore,
    }

    if (existingItem?.score?.id) {
      // Update existing score
      const { error: updateError } = await supabase
        .from('scores')
        .update({
          criteria: scores,
          calculated_score: calculatedScore,
        } as never)
        .eq('id', existingItem.score.id)

      if (updateError) {
        console.error('Error updating score:', updateError)
        return
      }
    } else {
      // Insert new score
      const { error: insertError } = await supabase
        .from('scores')
        .insert([scoreData as never])

      if (insertError) {
        console.error('Error inserting score:', insertError)
        return
      }
    }

    // Re-sort items based on updated scores (no need to refetch - local state is already updated)
    if (session && (session.framework === 'rice' || session.framework === 'ice' || session.framework === 'weighted')) {
      setItems((prevItems) => {
        const sorted = [...prevItems].sort((a, b) => {
          const scoreA = a.score?.calculated_score || 0
          const scoreB = b.score?.calculated_score || 0
          return scoreB - scoreA // Descending order
        })
        return sorted
      })
    }

    // Remove from updating state
    setUpdatingScores((prev) => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
  }

  // Handle score updates with debouncing
  const handleScoreUpdate = (
    itemId: string,
    scores: Record<string, number | string | WeightedItemScores>
  ) => {
    if (!session) return

    // Clear any existing timeout for this item
    const existingTimeout = saveTimeouts.current.get(itemId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Mark item as updating
    setUpdatingScores((prev) => new Set(prev).add(itemId))

    // Update local score immediately for instant feedback (sorting happens after save completes)
    const calculatedScore = calculateScore(scores, session.framework, session.weighted_criteria)
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              score: {
                id: item.score?.id || '',
                item_id: itemId,
                framework: session.framework,
                criteria: scores,
                calculated_score: calculatedScore,
              },
            }
          : item
      )
    )

    // Create new timeout for saving
    const timeoutId = setTimeout(() => {
      saveScoreToDatabase(itemId, scores)
      saveTimeouts.current.delete(itemId)
    }, 1500)

    // Store timeout
    saveTimeouts.current.set(itemId, timeoutId)
  }

  // Handle weighted criteria updates
  const handleWeightedCriteriaChange = async (criteria: WeightedCriterionData[]) => {
    if (!session) return

    const updates = { weighted_criteria: criteria }

    const { error: updateError } = await supabase
      .from('sessions')
      .update(updates as never)
      .eq('id', session.id)

    if (updateError) {
      console.error('Error updating weighted criteria:', updateError)
      alert('Failed to update criteria. Please try again.')
      return
    }

    setSession({ ...session, weighted_criteria: criteria })

    // Recalculate scores for all items with the new criteria
    if (session.framework === 'weighted') {
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.score?.criteria) {
            const itemScores = (item.score.criteria as { scores: WeightedItemScores }).scores || {}
            const newCalculatedScore = calculateWeightedScore(criteria as WeightedCriterion[], itemScores)
            return {
              ...item,
              score: {
                ...item.score,
                calculated_score: newCalculatedScore,
              },
            }
          }
          return item
        })
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    const isNetworkError = error?.toLowerCase().includes('network') || error?.toLowerCase().includes('fetch')

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isNetworkError ? 'bg-amber-100' : 'bg-gray-100'}`}>
            <svg
              className={`w-8 h-8 ${isNetworkError ? 'text-amber-600' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isNetworkError ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
          </div>
          {!isNetworkError && <h1 className="text-6xl font-bold text-gray-300 mb-2">404</h1>}
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isNetworkError ? 'Connection problem' : 'Session not found'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isNetworkError
              ? 'Unable to connect. Please check your internet connection and try again.'
              : "This session doesn't exist or may have been deleted."}
          </p>
          <div className="flex gap-3 justify-center">
            {isNetworkError && (
              <button
                onClick={() => window.location.reload()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className={`font-semibold py-2 px-4 rounded-lg transition-colors ${isNetworkError ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
            >
              {isNetworkError ? 'Go Home' : 'Create New Session'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Desktop header - hidden on mobile */}
          <div className="hidden lg:flex lg:items-center lg:justify-between">
            {/* Left: Logo + Session name + ID */}
            <div className="min-w-0 flex-1 flex items-center gap-3">
              <a href="/" className="flex-shrink-0" title="Go to home">
                <Logo className="w-9 h-9" />
              </a>
              <div className="min-w-0 flex items-center gap-3">
                {editingSessionName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={sessionNameInput}
                      onChange={(e) => setSessionNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSessionNameSave()
                        if (e.key === 'Escape') setEditingSessionName(false)
                      }}
                      placeholder="Session name"
                      className="text-lg font-display font-semibold text-gray-900 border-b-2 border-indigo-500 bg-transparent focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSessionNameSave}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingSessionName(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <h1
                      className="text-lg font-display font-semibold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors truncate max-w-xs"
                      onClick={startEditingSessionName}
                      title="Click to edit session name"
                    >
                      {session.name || 'Untitled Session'}
                    </h1>
                    {!session.name && (
                      <span className="text-sm text-gray-400 font-mono">{session.slug}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right: Participant indicator + Actions */}
            <div className="flex items-center gap-3">
              {/* Participant indicator */}
              {participantCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 pr-2 border-r border-gray-200">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>{participantCount} {participantCount === 1 ? 'participant' : 'participants'}</span>
                </div>
              )}

              {/* Session actions */}
              <button
                onClick={() => exportToCsv({
                  items,
                  framework: session.framework,
                  sessionName: session.name || session.slug,
                })}
                disabled={items.length === 0 || localView === 'roadmap'}
                title={localView === 'roadmap' ? 'Switch to Scoring or Backlog view to export' : undefined}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1.5 px-3 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export CSV
              </button>
              <button
                onClick={handleClearItems}
                disabled={items.length === 0}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1.5 px-3 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  setNotification({
                    title: 'URL Copied',
                    message: 'Session URL has been copied to your clipboard. Share it with your team to collaborate!',
                  })
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1.5 px-3 rounded-md transition-colors text-sm"
              >
                Copy URL
              </button>
              <button
                onClick={handleNewSession}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-3 rounded-md transition-colors text-sm"
              >
                New
              </button>
            </div>
          </div>

          {/* Mobile header - visible on mobile only */}
          <div className="lg:hidden flex items-center justify-between gap-3">
            <a href="/" className="flex-shrink-0" title="Go to home">
              <Logo className="w-10 h-10" id="mobile-brand" />
            </a>
            <div className="min-w-0 flex-1">
                {editingSessionName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={sessionNameInput}
                      onChange={(e) => setSessionNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSessionNameSave()
                        if (e.key === 'Escape') setEditingSessionName(false)
                      }}
                      placeholder="Session name"
                      className="text-xl font-display font-bold text-gray-900 border-b-2 border-indigo-500 bg-transparent focus:outline-none w-full"
                      autoFocus
                    />
                    <button
                      onClick={handleSessionNameSave}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingSessionName(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <h1
                    className="text-xl font-display font-bold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors truncate"
                    onClick={startEditingSessionName}
                    title="Click to edit session name"
                  >
                    {session.name || 'Untitled Session'}
                  </h1>
                )}
            </div>
            <div className="flex items-center gap-2 relative">
              {/* Participant count - compact on mobile */}
              {participantCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>{participantCount}</span>
                </div>
              )}
              {/* Kebab menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {/* Mobile menu dropdown */}
              <MobileMenu
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                view={localView}
                framework={session.framework}
                onFrameworkChange={handleFrameworkChange}
                onCopyUrl={() => {
                  navigator.clipboard.writeText(window.location.href)
                  setNotification({
                    title: 'URL Copied',
                    message: 'Session URL has been copied to your clipboard. Share it with your team to collaborate!',
                  })
                }}
                onExportCsv={() => exportToCsv({
                  items,
                  framework: session.framework,
                  sessionName: session.name || session.slug,
                })}
                onClearItems={handleClearItems}
                onNewSession={handleNewSession}
                itemCount={items.length}
              />
            </div>
          </div>
        </div>
      </header>

      {/* View Tabs - hidden on mobile, shown on desktop */}
      <div className="hidden lg:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <ViewTabs
            value={localView}
            onChange={handleViewChange}
            framework={session.framework}
            onFrameworkChange={handleFrameworkChange}
            onAddItemClick={() => setIsAddPanelOpen(true)}
          />
        </div>
      </div>

      {/* Mobile framework badge - only in scoring view */}
      {localView === 'scoring' && (
        <div className="lg:hidden bg-gray-50 border-b border-gray-200 px-4 py-2">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <span className="font-medium">
              {session.framework === 'rice' && 'RICE'}
              {session.framework === 'ice' && 'ICE'}
              {session.framework === 'value_effort' && 'Value vs Effort'}
              {session.framework === 'moscow' && 'MoSCoW'}
              {session.framework === 'weighted' && 'Weighted Scoring'}
            </span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Main content area - full width for most views, grid for roadmap */}
        <div className="space-y-4 sm:space-y-6 pb-24 lg:pb-0">
            {/* Scoring View */}
            {localView === 'scoring' && (
              <>
                {/* Value vs Effort Matrix */}
                {session.framework === 'value_effort' && items.length > 0 && (
                  <Suspense fallback={<div className="animate-pulse bg-gray-100 rounded-lg h-64" />}>
                    <ValueEffortMatrix
                      items={scoringViewItems}
                      onItemClick={handleMatrixItemClick}
                      selectedItemId={highlightedItemId || undefined}
                    />
                  </Suspense>
                )}

                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-display font-semibold text-gray-900">
                      Items ({items.length})
                    </h2>
                  </div>
                  <ItemList
                    items={scoringViewItems}
                    framework={session.framework}
                    onEdit={setEditingItem}
                    onDelete={handleDeleteItem}
                    onScoreUpdate={handleScoreUpdate}
                    updatingScores={updatingScores}
                    highlightedItemId={highlightedItemId || undefined}
                    weightedCriteria={session.weighted_criteria}
                  />
                </div>
              </>
            )}

            {/* Estimates View (Planning Poker) */}
            {localView === 'estimates' && (
              <div className="bg-white rounded-lg shadow">
                <EstimatesView
                  items={items}
                  sessionId={session.id}
                  participantName={participantName}
                  participants={participants}
                  currentEstimationItemId={session.current_estimation_item_id ?? null}
                  estimationRevealed={session.estimation_revealed ?? false}
                  onCurrentItemChange={handleCurrentEstimationItemChange}
                  onReveal={handleRevealVotes}
                  onAccept={handleAcceptEstimate}
                  onRevote={handleRevote}
                />
              </div>
            )}

            {/* Backlog View */}
            {localView === 'backlog' && (
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-display font-semibold text-gray-900">
                    Prioritised Backlog ({items.length})
                  </h2>
                </div>
                <BacklogList
                  items={backlogViewItems}
                  framework={session.framework}
                  isManualOrder={isManualOrder}
                  cutoffPosition={session.cutoff_position}
                  cutoffLabel={session.cutoff_label}
                  onEdit={setEditingItem}
                  onDelete={handleDeleteItem}
                  onReorder={handleBacklogReorder}
                  onResetOrder={handleResetBacklogOrder}
                  onCutoffChange={handleCutoffChange}
                  onCutoffLabelChange={handleCutoffLabelChange}
                />
              </div>
            )}

            {/* Roadmap View */}
            {localView === 'roadmap' && (
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                {/* Desktop: Roadmap timeline */}
                <div className="hidden lg:block">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-display font-semibold text-gray-900">
                      Roadmap
                    </h2>
                  </div>
                  <Suspense fallback={<div className="animate-pulse bg-gray-100 rounded-lg h-64" />}>
                    <RoadmapView
                      periods={roadmapPeriods}
                      items={items}
                      loading={roadmapPeriodsLoading}
                      onAddPeriod={addRoadmapPeriod}
                      onUpdatePeriod={updateRoadmapPeriod}
                      onDeletePeriod={handleDeletePeriod}
                      onScheduleItem={handleScheduleItem}
                      onUnscheduleItem={handleUnscheduleItem}
                    />
                  </Suspense>
                </div>

                {/* Mobile: Placeholder directing to desktop */}
                <div className="lg:hidden">
                  <RoadmapMobilePlaceholder />
                </div>
              </div>
            )}
        </div>
      </main>

      {/* Mobile FAB - only visible below lg breakpoint */}
      <FAB onClick={() => setIsAddSheetOpen(true)} />

      {/* Mobile bottom bar - only visible below lg breakpoint */}
      <MobileBottomBar
        framework={session.framework}
        view={localView}
        onFrameworkChange={handleFrameworkChange}
        onViewChange={handleViewChange}
        onAddItem={handleAddItem}
      />

      {/* Mobile add item bottom sheet */}
      <BottomSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        title="Add New Item"
      >
        <ItemForm
          onAdd={(item) => {
            handleAddItem(item)
            setIsAddSheetOpen(false)
          }}
        />
      </BottomSheet>

      {editingItem && (
        <ItemEditModal
          item={editingItem}
          onSave={handleEditItem}
          onCancel={() => setEditingItem(null)}
        />
      )}

      {/* Name prompt modal */}
      {needsName && (
        <NamePromptModal onSubmit={setParticipantName} />
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Notification modal */}
      {notification && (
        <ConfirmModal
          title={notification.title}
          message={notification.message}
          confirmLabel="OK"
          variant="default"
          onConfirm={() => setNotification(null)}
          onCancel={() => setNotification(null)}
        />
      )}

      {/* Add Item slide-in panel (desktop only) */}
      <SlideInPanel
        isOpen={isAddPanelOpen}
        onClose={() => setIsAddPanelOpen(false)}
        title="Add New Item"
      >
        {/* Weighted Criteria Editor - only show in scoring view with weighted framework */}
        {session.framework === 'weighted' && localView === 'scoring' && (
          <Suspense fallback={<div className="animate-pulse bg-gray-100 rounded-lg h-32 mb-4" />}>
            <WeightedCriteriaEditor
              criteria={session.weighted_criteria || []}
              onChange={handleWeightedCriteriaChange}
            />
          </Suspense>
        )}
        <ItemForm
          onAdd={(item) => {
            handleAddItem(item)
            setIsAddPanelOpen(false)
          }}
        />
      </SlideInPanel>
    </div>
  )
}
