import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Session, Item, ItemWithScore, Framework, Score, ViewMode } from '../types/database'
import { exportToCsv } from '../lib/exportCsv'
import BacklogList from '../components/BacklogList'
import { type FilterState, applyFilters } from '../components/BacklogToolbar'
import CapacityView from '../components/CapacityView'
import RoadmapView from '../components/RoadmapView'
import RoadmapMobileView from '../components/RoadmapMobileView'
import { isTouchDevice } from '../lib/device'
import { getDefaultChildDates } from '../lib/roadmap-dates'
import ItemDrawer from '../components/ItemDrawer'
import NamePromptModal from '../components/NamePromptModal'
import ConfirmModal from '../components/ConfirmModal'
import FAB from '../components/FAB'
import BottomSheet from '../components/BottomSheet'
import MobileMenu from '../components/MobileMenu'
import MobileChatModal from '../components/MobileChatModal'
import { useParticipantName } from '../hooks/useParticipantName'
import { usePresence } from '../hooks/usePresence'
import { useCutoffs } from '../hooks/useCutoffs'
import { useMessages } from '../hooks/useMessages'
import { useUnreadCount } from '../hooks/useUnreadCount'
import { getCascadedStatusUpdates, getDirectChildren } from '../lib/hierarchy'
import { useSessionContext } from '../contexts/SessionContext'

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
  useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Derive active view from the route path
  const getViewFromPath = (pathname: string): ViewMode => {
    if (pathname.endsWith('/roadmap')) return 'roadmap'
    if (pathname.endsWith('/capacity')) return 'capacity'
    return 'list'
  }
  // Use shared session data from SessionLayout context
  const sessionContext = useSessionContext()
  const session = sessionContext.session
  const items = sessionContext.items
  const setItems = sessionContext.setItems
  const setSession = sessionContext.setSession


  const editingItem = sessionContext.editingItem
  const setEditingItem = sessionContext.setEditingItem
  const isNewItem = sessionContext.isNewItem
  const [editingSessionName, setEditingSessionName] = useState(false)
  const [sessionNameInput, setSessionNameInput] = useState('')
  const [confirmModal, setConfirmModal] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: 'danger' | 'warning' | 'default'
    onConfirm: () => void
  } | null>(null)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [notification, setNotification] = useState<{
    title: string
    message: string
  } | null>(null)
  // View derived from route (desktop uses sidebar nav, mobile uses bottom bar)
  const localView = getViewFromPath(location.pathname)
  // Filter state for backlog toolbar
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    hasEstimate: null,
    onRoadmap: null,
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

      // "N" key creates a new item and opens the drawer
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        sessionContext.addItemAndEdit()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Helper function to fetch items with scores (used by realtime score subscription)
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

    if (items.length > 0 && framework) {
      const itemIds = items.map((item) => item.id)
      const { data: scoresData } = await supabase
        .from('scores')
        .select('*')
        .in('item_id', itemIds)
        .eq('framework', framework)

      const scores = (scoresData as Score[]) || []

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

  // Session data is loaded by SessionLayout — no fetch needed here

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

  // Real-time subscription for scores (items handled by SessionLayout)
  useEffect(() => {
    if (!session) return

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
      supabase.removeChannel(scoresChannel)
      supabase.removeChannel(sessionChannel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- items and session used via refs to avoid stale closures
  }, [session?.id, fetchItems])

  const handleAddItem = async (newItem: {
    title: string
    description: string
    parent_item_id?: string
    item_level?: number
  }) => {
    if (!session) return

    const position = items.length

    // Default dates: inherit from parent if child, otherwise today → today + 1 month
    const defaultDates = getDefaultChildDates(newItem.parent_item_id, items)

    const itemToInsert: Record<string, unknown> = {
      session_id: session.id,
      title: newItem.title,
      description: newItem.description || null,
      position,
      created_by: participantName,
      start_date: defaultDates.start,
      end_date: defaultDates.end,
    }

    // Add hierarchy fields if provided
    if (newItem.parent_item_id) {
      itemToInsert.parent_item_id = newItem.parent_item_id
    }
    if (newItem.item_level !== undefined) {
      itemToInsert.item_level = newItem.item_level
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

    // Add to items list (no score until user explicitly scores it)
    const newItemWithScore: ItemWithScore = { ...newItemData, score: undefined }
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

    // Update local state
    const newItems = items.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item))

    // Cascade status to parents if status changed
    const originalItem = items.find((i) => i.id === updatedItem.id)
    if (originalItem && originalItem.status !== updatedItem.status) {
      const cascadedUpdates = getCascadedStatusUpdates(updatedItem.id, newItems)
      const cascadeMap = new Map(cascadedUpdates.map((u) => [u.id, u.status]))

      setItems(newItems.map((item) =>
        cascadeMap.has(item.id) ? { ...item, status: cascadeMap.get(item.id)! } : item
      ))

      // Persist cascaded updates
      for (const update of cascadedUpdates) {
        await supabase
          .from('items')
          .update({ status: update.status } as never)
          .eq('id', update.id)
      }
    } else {
      setItems(newItems)
    }

    setEditingItem(null)
  }

  const handleStatusChange = async (itemId: string, status: import('../types/database').ItemStatus) => {
    // Compute cascaded parent updates before applying changes
    // We need the updated items array to compute cascading correctly
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, status } : item
    )
    const cascadedUpdates = getCascadedStatusUpdates(itemId, updatedItems)
    const cascadeMap = new Map(cascadedUpdates.map((u) => [u.id, u.status]))

    // Optimistically update local state (child + cascaded parents)
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) return { ...item, status }
        if (cascadeMap.has(item.id)) return { ...item, status: cascadeMap.get(item.id)! }
        return item
      })
    )

    // Persist child status to database
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
      return
    }

    // Persist cascaded parent status updates
    for (const update of cascadedUpdates) {
      await supabase
        .from('items')
        .update({ status: update.status } as never)
        .eq('id', update.id)
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

        setItems((prevItems) => prevItems.filter((item) => item.id !== itemId))
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

        setItems((prevItems) => prevItems.filter((item) => !itemIds.includes(item.id)))
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
  const backlogViewItems = applyFilters(sortedItems, filters)

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

  // ============================================
  // Date-based roadmap handlers
  // ============================================

  const handleSetItemDates = async (itemId: string, startDate: string, endDate: string) => {
    const item = items.find((i) => i.id === itemId)

    // Collect descendants that need constraining within new bounds
    const descendantUpdates: { id: string; start: string; end: string }[] = []
    if (item) {
      const collectConstraints = (parentId: string, parentStart: string, parentEnd: string) => {
        const children = getDirectChildren(parentId, items)
        for (const child of children) {
          if (child.start_date && child.end_date) {
            const newStart = child.start_date < parentStart ? parentStart : child.start_date
            const newEnd = child.end_date > parentEnd ? parentEnd : child.end_date
            if (newStart !== child.start_date || newEnd !== child.end_date) {
              const safeStart = newStart <= newEnd ? newStart : newEnd
              const safeEnd = newStart <= newEnd ? newEnd : newStart
              descendantUpdates.push({ id: child.id, start: safeStart, end: safeEnd })
              collectConstraints(child.id, safeStart, safeEnd)
            } else {
              collectConstraints(child.id, child.start_date, child.end_date)
            }
          }
        }
      }
      collectConstraints(itemId, startDate, endDate)
    }

    // Optimistic update
    const childUpdateMap = new Map(descendantUpdates.map((u) => [u.id, u]))
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === itemId) return { ...i, start_date: startDate, end_date: endDate }
        if (childUpdateMap.has(i.id)) {
          const u = childUpdateMap.get(i.id)!
          return { ...i, start_date: u.start, end_date: u.end }
        }
        return i
      })
    )

    // Persist
    await supabase.from('items').update({ start_date: startDate, end_date: endDate } as never).eq('id', itemId)
    for (const u of descendantUpdates) {
      await supabase.from('items').update({ start_date: u.start, end_date: u.end } as never).eq('id', u.id)
    }
  }

  const handleMoveItemDates = async (itemId: string, newStart: string, newEnd: string) => {
    const movedItem = items.find((i) => i.id === itemId)
    if (!movedItem || !movedItem.start_date) return

    const origStartMs = new Date(movedItem.start_date).getTime()
    const newStartMs = new Date(newStart).getTime()
    const deltaDays = Math.round((newStartMs - origStartMs) / (1000 * 60 * 60 * 24))

    // Collect all descendant moves
    const allUpdates: { id: string; start: string; end: string }[] = [
      { id: itemId, start: newStart, end: newEnd },
    ]

    if (deltaDays !== 0) {
      const collectMoves = (parentId: string) => {
        const kids = getDirectChildren(parentId, items)
        for (const child of kids) {
          if (child.start_date && child.end_date) {
            const addDays = (d: string, n: number) => {
              const date = new Date(d)
              date.setUTCDate(date.getUTCDate() + n)
              const y = date.getUTCFullYear()
              const m = String(date.getUTCMonth() + 1).padStart(2, '0')
              const day = String(date.getUTCDate()).padStart(2, '0')
              return `${y}-${m}-${day}`
            }
            allUpdates.push({
              id: child.id,
              start: addDays(child.start_date, deltaDays),
              end: addDays(child.end_date, deltaDays),
            })
            collectMoves(child.id)
          }
        }
      }
      collectMoves(itemId)
    }

    // Optimistic update
    const updateMap = new Map(allUpdates.map((u) => [u.id, u]))
    setItems((prev) =>
      prev.map((i) => {
        const u = updateMap.get(i.id)
        if (u) return { ...i, start_date: u.start, end_date: u.end }
        return i
      })
    )

    // Persist
    for (const u of allUpdates) {
      await supabase.from('items').update({ start_date: u.start, end_date: u.end } as never).eq('id', u.id)
    }
  }

  const handleClearItemDates = async (itemId: string) => {
    const currentItem = items.find((i) => i.id === itemId)

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, start_date: null, end_date: null } : i))
    )

    const { error } = await supabase
      .from('items')
      .update({ start_date: null, end_date: null } as never)
      .eq('id', itemId)

    if (error) {
      console.error('Error clearing item dates:', error)
      if (currentItem) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? { ...i, start_date: currentItem.start_date, end_date: currentItem.end_date }
              : i
          )
        )
      }
    }
  }

  const handleSetRoadmapZoom = async (zoom: string, customStart?: string, customEnd?: string) => {
    if (!session) return

    const updates: Record<string, unknown> = { roadmap_zoom: zoom }
    if (zoom === 'custom') {
      if (customStart) updates.roadmap_start_date = customStart
      if (customEnd) updates.roadmap_end_date = customEnd
    } else {
      updates.roadmap_start_date = null
      updates.roadmap_end_date = null
    }

    setSession((prev) =>
      prev
        ? {
            ...prev,
            roadmap_zoom: zoom as Session['roadmap_zoom'],
            roadmap_start_date: (updates.roadmap_start_date as string) ?? null,
            roadmap_end_date: (updates.roadmap_end_date as string) ?? null,
          }
        : prev
    )

    await supabase.from('sessions').update(updates as never).eq('id', session.id)
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

  // Session data provided by SessionLayout — guard just in case
  if (!session) return null

  return (
    <>
      {/* Mobile header — hidden on desktop where AppShell provides the header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sm:hidden">
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
                  <button
                    className="group flex items-center gap-1.5 text-left max-w-full cursor-pointer"
                    onClick={startEditingSessionName}
                  >
                    <h1 className={`text-xl font-display font-bold truncate transition-colors group-hover:text-indigo-600 ${
                      session.name ? 'text-gray-900' : 'text-gray-400 italic'
                    }`}>
                      {session.name || 'Name your session...'}
                    </h1>
                    <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
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
        <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-0">
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
                        filters.status !== 'all' || filters.hasEstimate !== null || filters.onRoadmap !== null                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      Filters
                      {(filters.status !== 'all' || filters.hasEstimate !== null || filters.onRoadmap !== null ) && (
                        <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                      )}
                    </button>

                  </div>

                  {/* Filter summary (when active) */}
                  {(filters.status !== 'all' || filters.hasEstimate !== null || filters.onRoadmap !== null  || filters.search) && backlogViewItems.length !== items.length && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <span className="text-gray-500">
                        Showing {backlogViewItems.length} of {items.length}
                      </span>
                      <button
                        onClick={() => setFilters({ search: '', status: 'all', hasEstimate: null, onRoadmap: null })}
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
                                    onEdit={setEditingItem}
                  onDelete={handleDeleteItem}
                  onDeleteMultiple={handleDeleteMultiple}
                  onReorder={handleBacklogReorder}
                  onAddCutoff={(position) => addCutoff(position)}
                  onUpdateCutoff={updateCutoff}
                  onDeleteCutoff={deleteCutoff}
                  onStatusChange={handleStatusChange}
                  onStatusChangeMultiple={handleStatusChangeMultiple}
                  onAddChild={(parentId, parentLevel, title) => {
                    handleAddItem({
                      title,
                      description: '',
                      parent_item_id: parentId,
                      item_level: parentLevel + 1,
                    })
                  }}
                />
              </div>
            )}

            {/* Roadmap View */}
            {localView === 'roadmap' && session && (
              isTouchDevice() ? (
                <RoadmapMobileView
                  items={items}
                  session={session}
                  onItemClick={(itemId) => {
                    const item = items.find(i => i.id === itemId)
                    if (item) setEditingItem(item)
                  }}
                  onSetZoom={handleSetRoadmapZoom}
                />
              ) : (
                <>
                  <div className="hidden sm:block">
                    <RoadmapView
                      items={items}
                      loading={false}
                      session={session}
                      onSetItemDates={handleSetItemDates}
                      onMoveItem={handleMoveItemDates}
                      onClearItemDates={handleClearItemDates}
                      onSetZoom={handleSetRoadmapZoom}
                      onItemClick={(itemId) => {
                        const item = items.find(i => i.id === itemId)
                        if (item) setEditingItem(item)
                      }}
                    />
                  </div>
                  <div className="sm:hidden">
                    <RoadmapMobileView
                      items={items}
                      session={session}
                      onItemClick={(itemId) => {
                        const item = items.find(i => i.id === itemId)
                        if (item) setEditingItem(item)
                      }}
                      onSetZoom={handleSetRoadmapZoom}
                    />
                  </div>
                </>
              )
            )}

            {/* Capacity Planning View */}
            {localView === 'capacity' && (
              <CapacityView
                session={session}
                items={items}
                onSessionUpdate={setSession}
                onItemUpdate={(itemId, updates) => {
                  setItems((prev) =>
                    prev.map((item) =>
                      item.id === itemId ? { ...item, ...updates } : item
                    )
                  )
                }}
                onEditItem={setEditingItem}
              />
            )}
        </div>
      </main>

      {/* FAB for adding items */}
      <FAB onClick={() => sessionContext.addItemAndEdit()} />

      {/* Bottom tab bar */}
      {/* MobileBottomBar is now rendered in AppShell */}

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

          {/* Clear filters button */}
          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={() => {
                setFilters({ search: '', status: 'all', hasEstimate: null, onRoadmap: null })
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
        isNew={isNewItem}
        framework={session.framework}
        allItems={items}
        onClose={() => { setEditingItem(null) }}
        onSave={handleEditItem}
        onDelete={handleDeleteItem}
        onSetItemDates={handleSetItemDates}
        onClearItemDates={handleClearItemDates}
        onNavigateToItem={(navItem) => setEditingItem(navItem)}
        onAddChild={(parentId, parentLevel, childItemTitle) => {
          handleAddItem({
            title: childItemTitle,
            description: '',
            parent_item_id: parentId,
            item_level: parentLevel + 1,
          })
        }}
        onCreate={async (newItem) => {
          if (!session) return undefined
          const position = items.length
          const itemToInsert: Record<string, unknown> = {
            session_id: session.id,
            title: newItem.title,
            description: newItem.description || null,
            position,
            status: newItem.status,
            created_by: participantName,
            item_level: newItem.item_level,
            start_date: newItem.start_date,
            end_date: newItem.end_date,
          }
          const { data, error: insertError } = await supabase
            .from('items')
            .insert([itemToInsert as never])
            .select()
            .single()
          if (insertError) {
            console.error('Error creating item:', insertError)
            return undefined
          }
          const created: ItemWithScore = { ...(data as Item), score: undefined }
          setItems(prev => [...prev, created])
          // Also update the editing item to the real record so drawer reflects saved state
          setEditingItem(created)
          return created.id
        }}
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

    </>
  )
}
