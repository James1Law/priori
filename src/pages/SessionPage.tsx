import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Session, Item, ItemWithScore, Framework, Score, WeightedCriterionData } from '../types/database'
import { calculateRiceScore } from '../lib/rice'
import { calculateIceScore } from '../lib/ice'
import { calculateWeightedScore, type WeightedCriterion, type WeightedItemScores } from '../lib/weighted'
import { exportToCsv } from '../lib/exportCsv'
import ItemForm from '../components/ItemForm'
import ItemList from '../components/ItemList'
import ItemEditModal from '../components/ItemEditModal'
import FrameworkSelector from '../components/FrameworkSelector'
import NamePromptModal from '../components/NamePromptModal'
import { useParticipantName } from '../hooks/useParticipantName'
import { usePresence } from '../hooks/usePresence'

// Lazy load components that are only used for specific frameworks
const ValueEffortMatrix = lazy(() => import('../components/ValueEffortMatrix'))
const WeightedCriteriaEditor = lazy(() => import('../components/WeightedCriteriaEditor'))

function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="header-brand-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#header-brand-gradient)" />
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
  const saveTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Participant name and presence
  const { name: participantName, setName: setParticipantName, needsName } = useParticipantName()
  const { participantCount } = usePresence(session?.id || null, participantName)

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
        setSession(sessionData)
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

          // Verify this score belongs to an item in our session
          const itemBelongsToSession = items.some(
            (item) => item.id === scoreData.item_id
          )
          if (!itemBelongsToSession && payload.eventType !== 'DELETE') {
            // Check database if item exists in session (for new items we might not have locally)
            const { data } = await supabase
              .from('items')
              .select('id')
              .eq('id', scoreData.item_id)
              .eq('session_id', session.id)
              .single()
            if (!data) return
          }

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newScore = payload.new as Score
            // Only update if framework matches
            if (newScore.framework !== session.framework) return

            setItems((prevItems) => {
              const updatedItems = prevItems.map((item) =>
                item.id === newScore.item_id
                  ? { ...item, score: newScore }
                  : item
              )
              // Re-sort if using a scored framework
              if (session.framework === 'rice' || session.framework === 'ice' || session.framework === 'weighted') {
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
          // Refetch items if framework changed
          if (updatedSession.framework !== session.framework) {
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
  }, [session?.id, session?.framework, fetchItems])

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

    setItems([...items, data as Item])
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

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return
    }

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
  }

  const handleClearItems = async () => {
    if (!session) return
    if (!confirm('Are you sure you want to delete all items? This cannot be undone.')) {
      return
    }

    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('session_id', session.id)

    if (deleteError) {
      console.error('Error clearing items:', deleteError)
      alert('Failed to clear items. Please try again.')
      return
    }

    setItems([])
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

    // Refetch items to update scores and re-sort
    if (session) {
      await fetchItems(session.id, session.framework)
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

    // Update local score immediately for instant feedback
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1 flex items-center gap-3">
              <a href="/" className="flex-shrink-0" title="Go to home">
                <Logo className="w-10 h-10" />
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
                      className="text-xl sm:text-2xl font-display font-bold text-gray-900 border-b-2 border-indigo-500 bg-transparent focus:outline-none w-full"
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
                    className="text-xl sm:text-2xl font-display font-bold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors truncate"
                    onClick={startEditingSessionName}
                    title="Click to edit session name"
                  >
                    {session.name || 'Untitled Session'}
                  </h1>
                )}
                {!session.name && (
                  <p className="text-sm text-gray-500 mt-1">
                    Session: {session.slug}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {/* Participant count */}
              {participantCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="hidden sm:inline">{participantCount} {participantCount === 1 ? 'participant' : 'participants'}</span>
                  <span className="sm:hidden">{participantCount}</span>
                </div>
              )}
              <button
                onClick={() => exportToCsv({
                  items,
                  framework: session.framework,
                  sessionName: session.name || session.slug,
                })}
                disabled={items.length === 0}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </button>
              <button
                onClick={handleClearItems}
                disabled={items.length === 0}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  alert('Session URL copied to clipboard!')
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm"
              >
                <span className="hidden sm:inline">Copy URL</span>
                <span className="sm:hidden">Copy</span>
              </button>
              <button
                onClick={handleNewSession}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm"
              >
                New
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Add Item Form */}
          <div className="lg:col-span-1 order-first lg:order-none">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6 lg:sticky lg:top-8">
              <FrameworkSelector
                value={session.framework}
                onChange={handleFrameworkChange}
              />
              {/* Weighted Criteria Editor */}
              {session.framework === 'weighted' && (
                <Suspense fallback={<div className="animate-pulse bg-gray-100 rounded-lg h-32 mb-4" />}>
                  <WeightedCriteriaEditor
                    criteria={session.weighted_criteria || []}
                    onChange={handleWeightedCriteriaChange}
                  />
                </Suspense>
              )}
              <h2 className="text-xl font-display font-semibold text-gray-900 mb-4">
                Add New Item
              </h2>
              <ItemForm onAdd={handleAddItem} />
            </div>
          </div>

          {/* Items List */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Value vs Effort Matrix */}
            {session.framework === 'value_effort' && items.length > 0 && (
              <Suspense fallback={<div className="animate-pulse bg-gray-100 rounded-lg h-64" />}>
                <ValueEffortMatrix
                  items={items}
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
                items={items}
                framework={session.framework}
                onEdit={setEditingItem}
                onDelete={handleDeleteItem}
                onScoreUpdate={handleScoreUpdate}
                updatingScores={updatingScores}
                highlightedItemId={highlightedItemId || undefined}
                weightedCriteria={session.weighted_criteria}
              />
            </div>
          </div>
        </div>
      </main>

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
    </div>
  )
}
