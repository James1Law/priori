import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Session, Item, ItemWithScore, Framework, Score, WeightedCriterionData, ViewMode } from '../types/database'
import { calculateRiceScore } from '../lib/rice'
import { calculateIceScore } from '../lib/ice'
import { calculateWeightedScore, type WeightedCriterion, type WeightedItemScores } from '../lib/weighted'
import { exportToCsv } from '../lib/exportCsv'
import ItemForm from '../components/ItemForm'
import BacklogList from '../components/BacklogList'
import { type FilterState, applyFilters } from '../components/BacklogToolbar'
import MobileRoadmapView from '../components/MobileRoadmapView'
import ItemDrawer from '../components/ItemDrawer'
import NamePromptModal from '../components/NamePromptModal'
import MobileBottomBar from '../components/MobileBottomBar'
import ConfirmModal from '../components/ConfirmModal'
import FAB from '../components/FAB'
import BottomSheet from '../components/BottomSheet'
import MobileMenu from '../components/MobileMenu'
import MobileChatModal from '../components/MobileChatModal'
import { useParticipantName } from '../hooks/useParticipantName'
import { usePresence } from '../hooks/usePresence'
import { useRoadmapPeriods } from '../hooks/useRoadmapPeriods'
import { useCutoffs } from '../hooks/useCutoffs'
import { useMessages } from '../hooks/useMessages'
import { useUnreadCount } from '../hooks/useUnreadCount'

// Lazy load components that are only used for specific views

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
  const [editingItem, setEditingItem] = useState<ItemWithScore | null>(null)
  const [editingSessionName, setEditingSessionName] = useState(false)
  const [sessionNameInput, setSessionNameInput] = useState('')
  const [confirmModal, setConfirmModal] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: 'danger' | 'warning' | 'default'
    onConfirm: () => void
  } | null>(null)
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [notification, setNotification] = useState<{
    title: string
    message: string
  } | null>(null)
  // Local view state - stored per-participant, not synced to database
  const [localView, setLocalView] = useState<ViewMode>('list')
  // Filter state for backlog toolbar
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    hasEstimate: null,
    onRoadmap: null,
    period: null,
  })
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

  // Chat messages and unread count
  const { messages, loading: messagesLoading, sendMessage } = useMessages(session?.id || null, participantName)
  const { unreadCount } = useUnreadCount(session?.id || null, messages, isChatOpen)

  // Presence tracking
  const { participantCount } = usePresence(
    session?.id || null,
    participantName
  )

  // Roadmap periods
  const {
    periods: roadmapPeriods,
    loading: roadmapPeriodsLoading,
    addPeriod: addRoadmapPeriod,
    updatePeriod: updateRoadmapPeriod,
    deletePeriod: deleteRoadmapPeriod,
  } = useRoadmapPeriods(localView === 'roadmap' ? (session?.id ?? null) : null)

  // Cutoffs hook
  const {
    cutoffs,
    addCutoff,
    updateCutoff,
    deleteCutoff,
  } = useCutoffs(session?.id ?? null)

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
        setIsAddSheetOpen(true)
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
      status: updatedItem.status,
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

    setItems(items.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item)))
    setEditingItem(null)
  }

  const handleStatusChange = async (itemId: string, status: import('../types/database').ItemStatus) => {
    // Optimistically update local state
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, status } : item
      )
    )

    // Persist to database
    const { error } = await supabase
      .from('items')
      .update({ status } as never)
      .eq('id', itemId)

    if (error) {
      console.error('Error updating item status:', error)
      // Revert on error
      const originalItem = items.find((item) => item.id === itemId)
      if (originalItem) {
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId ? { ...item, status: originalItem.status } : item
          )
        )
      }
    }
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

  const handleDeleteMultiple = (itemIds: string[]) => {
    setConfirmModal({
      title: 'Delete Items',
      message: `Are you sure you want to delete ${itemIds.length} ${itemIds.length === 1 ? 'item' : 'items'}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(null)

        const { error: deleteError } = await supabase
          .from('items')
          .delete()
          .in('id', itemIds)

        if (deleteError) {
          console.error('Error deleting items:', deleteError)
          alert('Failed to delete items. Please try again.')
          return
        }

        setItems(items.filter((item) => !itemIds.includes(item.id)))
      },
    })
  }

  const handleStatusChangeMultiple = async (itemIds: string[], status: import('../types/database').ItemStatus) => {
    // Optimistically update local state
    setItems((prevItems) =>
      prevItems.map((item) =>
        itemIds.includes(item.id) ? { ...item, status } : item
      )
    )

    // Persist to database
    const { error } = await supabase
      .from('items')
      .update({ status } as never)
      .in('id', itemIds)

    if (error) {
      console.error('Error updating items status:', error)
      // Note: we don't revert on error for bulk operations to avoid complexity
    }
  }

  const handleAssignPeriod = async (itemIds: string[], periodPosition: number) => {
    if (!roadmapPeriods.length) return

    // Calculate quadrant for the start of this period
    const QUADRANTS_PER_PERIOD = 4
    const startQuadrant = periodPosition * QUADRANTS_PER_PERIOD
    const endQuadrant = startQuadrant // Single quadrant by default

    // Optimistically update local state
    setItems((prevItems) =>
      prevItems.map((item) =>
        itemIds.includes(item.id)
          ? { ...item, roadmap_start_quadrant: startQuadrant, roadmap_end_quadrant: endQuadrant }
          : item
      )
    )

    // Persist to database
    for (const itemId of itemIds) {
      const { error } = await supabase
        .from('items')
        .update({
          roadmap_start_quadrant: startQuadrant,
          roadmap_end_quadrant: endQuadrant,
        } as never)
        .eq('id', itemId)

      if (error) {
        console.error('Error assigning period to item:', error)
      }
    }
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

        // Also clear all cutoffs since there are no items
        const { error: cutoffError } = await supabase
          .from('cutoffs')
          .delete()
          .eq('session_id', session.id)

        if (cutoffError) {
          console.error('Error clearing cutoffs:', cutoffError)
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

  // Initialize local view from localStorage on mount
  useEffect(() => {
    if (!slug) return
    const savedView = localStorage.getItem(`priori_view_${slug}`)
    // Support new view modes, and migrate legacy views to 'list'
    if (savedView === 'roadmap') {
      setLocalView('roadmap')
    } else if (savedView && ['list', 'scoring', 'estimates', 'backlog'].includes(savedView)) {
      // Migrate legacy views to 'list'
      setLocalView('list')
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

  // Get items sorted for backlog view (by backlog_position if set, otherwise by score)
  const sortedItems = isManualOrder
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

  // Apply filters to sorted items
  const backlogViewItems = applyFilters(sortedItems, filters, roadmapPeriods)

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

  // NOTE: Planning Poker and Scoring UI handlers removed during backlog-centric redesign.
  // They will be re-added when Phase 3 (Dedicated Flows) is implemented.
  // The handlers can be restored from git history if needed.

  // Helper to calculate score based on framework (still needed for default scores on new items)
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
          <div className="flex items-center justify-between gap-3">
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
              {/* Participant count with chat icon - compact on mobile */}
              {participantCount > 0 && (
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  title="Open team chat"
                >
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>{participantCount}</span>
                  <span className="relative">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-medium text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </span>
                </button>
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
                  periods: roadmapPeriods,
                })}
                onClearItems={handleClearItems}
                onNewSession={handleNewSession}
                itemCount={items.length}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Main content area */}
        <div className="space-y-4 sm:space-y-6 pb-24">
            {/* List View - the main backlog-centric view */}
            {localView === 'list' && (
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                {/* Compact toolbar - search + filters button */}
                <div className="mb-4">
                  {/* Search + Filters row */}
                  <div className="flex items-center gap-2">
                    {/* Search input */}
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {filters.search && (
                        <button
                          onClick={() => setFilters({ ...filters, search: '' })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                          aria-label="Clear search"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Filters button */}
                    <button
                      onClick={() => setIsFilterSheetOpen(true)}
                      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        filters.status !== 'all' || filters.hasEstimate !== null || filters.onRoadmap !== null || filters.period !== null
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      Filters
                      {(filters.status !== 'all' || filters.hasEstimate !== null || filters.onRoadmap !== null || filters.period !== null) && (
                        <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                      )}
                    </button>
                  </div>

                  {/* Filter summary (when active) */}
                  {(filters.status !== 'all' || filters.hasEstimate !== null || filters.onRoadmap !== null || filters.period !== null || filters.search) && backlogViewItems.length !== items.length && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <span className="text-gray-500">
                        Showing {backlogViewItems.length} of {items.length}
                      </span>
                      <button
                        onClick={() => setFilters({ search: '', status: 'all', hasEstimate: null, onRoadmap: null, period: null })}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                <BacklogList
                  items={backlogViewItems}
                  framework={session.framework}
                  isManualOrder={isManualOrder}
                  cutoffs={cutoffs}
                  periods={roadmapPeriods}
                  onEdit={setEditingItem}
                  onDelete={handleDeleteItem}
                  onDeleteMultiple={handleDeleteMultiple}
                  onReorder={handleBacklogReorder}
                  onAddCutoff={(position) => addCutoff(position)}
                  onUpdateCutoff={updateCutoff}
                  onDeleteCutoff={deleteCutoff}
                  onStatusChange={handleStatusChange}
                  onStatusChangeMultiple={handleStatusChangeMultiple}
                  onAssignPeriod={handleAssignPeriod}
                  onScore={(selectedItemIds) => navigate(`/s/${slug}/score`, { state: { selectedItemIds } })}
                  onEstimate={(selectedItemIds) => navigate(`/s/${slug}/estimate`, { state: { selectedItemIds } })}
                />
              </div>
            )}

            {/* Roadmap View */}
            {localView === 'roadmap' && (
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <MobileRoadmapView
                  periods={roadmapPeriods}
                  items={items}
                  loading={roadmapPeriodsLoading}
                  onScheduleItem={handleScheduleItem}
                  onAddPeriod={addRoadmapPeriod}
                  onUpdatePeriod={updateRoadmapPeriod}
                  onDeletePeriod={handleDeletePeriod}
                />
              </div>
            )}
        </div>
      </main>

      {/* FAB for adding items */}
      <FAB onClick={() => setIsAddSheetOpen(true)} />

      {/* Bottom tab bar */}
      <MobileBottomBar
        view={localView}
        onViewChange={handleViewChange}
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

      {/* Mobile filters bottom sheet */}
      <BottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filters"
      >
        <div className="space-y-4">
          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'todo', label: 'To Do' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'done', label: 'Done' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilters({ ...filters, status: option.value as FilterState['status'] })}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    filters.status === option.value
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Filters</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilters({ ...filters, hasEstimate: filters.hasEstimate === true ? null : true })}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  filters.hasEstimate === true
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                Estimated
              </button>
              <button
                onClick={() => setFilters({ ...filters, onRoadmap: filters.onRoadmap === true ? null : true })}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  filters.onRoadmap === true
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                On Roadmap
              </button>
            </div>
          </div>

          {/* Period filter */}
          {roadmapPeriods.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilters({ ...filters, period: null })}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    filters.period === null
                      ? 'bg-purple-50 border-purple-200 text-purple-700'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  All
                </button>
                {[...roadmapPeriods].sort((a, b) => a.position - b.position).map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setFilters({ ...filters, period: period.id })}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                      filters.period === period.id
                        ? 'bg-purple-50 border-purple-200 text-purple-700'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                  >
                    {period.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear filters button */}
          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={() => {
                setFilters({ search: '', status: 'all', hasEstimate: null, onRoadmap: null, period: null })
                setIsFilterSheetOpen(false)
              }}
              className="w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Item Drawer */}
      <ItemDrawer
        item={editingItem}
        isOpen={editingItem !== null}
        framework={session.framework}
        periods={roadmapPeriods}
        onClose={() => setEditingItem(null)}
        onSave={handleEditItem}
        onDelete={handleDeleteItem}
        onAssignPeriod={(itemId, start, end) => handleScheduleItem(itemId, start, end)}
        onUnassignPeriod={handleUnscheduleItem}
      />

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

      {/* Chat modal */}
      <MobileChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        sessionId={session.id}
        currentUser={participantName || 'Anonymous'}
        messages={messages}
        loading={messagesLoading}
        onSendMessage={sendMessage}
      />

    </div>
  )
}
