import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Session, Item, ItemWithScore, Score } from '../types/database'
import Breadcrumb from '../components/Breadcrumb'
import EstimationQueue from '../components/EstimationQueue'
import EstimationCards from '../components/EstimationCards'
import CurrentEstimationItem from '../components/CurrentEstimationItem'
import ParticipantVotes from '../components/ParticipantVotes'
import EstimationResults from '../components/EstimationResults'
import NamePromptModal from '../components/NamePromptModal'
import { useEstimationVotes } from '../hooks/useEstimationVotes'
import { useParticipantName } from '../hooks/useParticipantName'
import { usePresence } from '../hooks/usePresence'

interface Participant {
  name: string
  joinedAt: string
}

function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="estimation-logo-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#estimation-logo-gradient)" />
      <path d="M24 12L36 34H12L24 12Z" fill="white" />
    </svg>
  )
}

export default function EstimationFlowPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Get selected item IDs - from navigation state initially, then from session
  const navigationSelectedIds = (location.state as { selectedItemIds?: string[] })?.selectedItemIds || []
  const [initializedEstimation, setInitializedEstimation] = useState(false)

  const [session, setSession] = useState<Session | null>(null)
  const [allItems, setAllItems] = useState<ItemWithScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  // Participant name and presence
  const { name: participantName, setName: setParticipantName, needsName } = useParticipantName()
  const { participants } = usePresence(session?.id || null, participantName)

  // Planning Poker state (synced to session)
  const currentEstimationItemId = session?.current_estimation_item_id || null
  const estimationRevealed = session?.estimation_revealed || false

  // Track re-vote events - increment when estimation_revealed transitions true -> false
  const [revoteCounter, setRevoteCounter] = useState(0)
  const [prevRevealed, setPrevRevealed] = useState(false)
  const [prevItemId, setPrevItemId] = useState<string | null>(null)

  // Detect re-vote: estimation_revealed goes from true to false for the same item
  useEffect(() => {
    if (prevRevealed === true && estimationRevealed === false &&
        currentEstimationItemId === prevItemId && prevItemId !== null) {
      // Re-vote was triggered - increment counter to force re-fetch
      setRevoteCounter(prev => prev + 1)
    }
    setPrevRevealed(estimationRevealed)
    setPrevItemId(currentEstimationItemId)
  }, [estimationRevealed, currentEstimationItemId, prevRevealed, prevItemId])

  // Estimation votes hook - pass revoteCounter to force re-fetch on re-vote
  const { votes, submitVote, clearVotes } = useEstimationVotes(
    session?.id || null,
    currentEstimationItemId,
    participantName,
    revoteCounter
  )

  // Determine which item IDs to use for estimation
  // Priority: session.estimation_item_ids (shared) > navigationSelectedIds (local)
  const estimationItemIds = useMemo(() => {
    // If session has estimation_item_ids set, use those (shared across all participants)
    if (session?.estimation_item_ids && session.estimation_item_ids.length > 0) {
      return session.estimation_item_ids
    }
    // Otherwise use navigation state (for the user who started estimation)
    return navigationSelectedIds
  }, [session?.estimation_item_ids, navigationSelectedIds])

  // Initialize estimation_item_ids in session when navigating with selected items
  useEffect(() => {
    if (!session || initializedEstimation) return

    // Only initialize if we have navigation selected IDs and session doesn't have them
    const sessionHasIds = session.estimation_item_ids && session.estimation_item_ids.length > 0
    const hasNavigationIds = navigationSelectedIds.length > 0

    if (hasNavigationIds && !sessionHasIds) {
      // Save the selected item IDs to session for all participants to see
      supabase
        .from('sessions')
        .update({ estimation_item_ids: navigationSelectedIds } as never)
        .eq('id', session.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error saving estimation item IDs:', error)
          } else {
            setSession(prev => prev ? { ...prev, estimation_item_ids: navigationSelectedIds } : null)
          }
        })
    }
    setInitializedEstimation(true)
  }, [session, navigationSelectedIds, initializedEstimation])

  // Get items for estimation (either selected items or all items)
  const itemsToEstimate = useMemo(() => {
    if (estimationItemIds.length > 0) {
      return allItems.filter(item => estimationItemIds.includes(item.id))
    }
    return allItems
  }, [allItems, estimationItemIds])

  // Current item being estimated
  const currentItem = currentEstimationItemId
    ? itemsToEstimate.find(item => item.id === currentEstimationItemId) || null
    : null

  // Current user's vote
  const currentUserVote = votes.find(v => v.participant_name === participantName)
  const selectedVote = currentUserVote?.vote ?? null

  // Find next unestimated item
  const getNextUnestimatedItem = useCallback(() => {
    const sortedItems = [...itemsToEstimate].sort((a, b) => {
      const posA = a.backlog_position ?? a.position
      const posB = b.backlog_position ?? b.position
      return posA - posB
    })

    return sortedItems.find(
      item =>
        item.id !== currentEstimationItemId &&
        (item.story_points === null || item.story_points === undefined)
    )
  }, [itemsToEstimate, currentEstimationItemId])

  const nextUnestimatedItem = getNextUnestimatedItem()
  const hasNextItem = nextUnestimatedItem !== undefined

  // Fetch session and items
  const fetchData = useCallback(async () => {
    if (!slug) {
      navigate('/')
      return
    }

    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('slug', slug)
        .single()

      if (sessionError) {
        if (sessionError.code === 'PGRST116') {
          setError('Session not found')
        } else {
          throw sessionError
        }
        return
      }

      const session = sessionData as Session
      setSession(session)

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('session_id', session.id)
        .order('position', { ascending: true })

      if (itemsError) throw itemsError

      const items = (itemsData as Item[]) || []

      // Fetch scores for all items if framework is set
      if (items.length > 0 && session.framework) {
        const itemIds = items.map(item => item.id)
        const { data: scoresData } = await supabase
          .from('scores')
          .select('*')
          .in('item_id', itemIds)
          .eq('framework', session.framework)

        const scores = (scoresData as Score[]) || []

        const itemsWithScores: ItemWithScore[] = items.map(item => ({
          ...item,
          score: scores.find(s => s.item_id === item.id),
        }))

        setAllItems(itemsWithScores)
      } else {
        setAllItems(items)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [slug, navigate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Subscribe to real-time session updates (for planning poker state)
  useEffect(() => {
    if (!session) return

    const sessionChannel = supabase
      .channel(`session:estimation_${session.id}`)
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
        }
      )
      .subscribe()

    // Also subscribe to item updates (for story_points)
    const itemsChannel = supabase
      .channel(`items:estimation_${session.id}`)
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
          setAllItems(prevItems =>
            prevItems.map(item =>
              item.id === updatedItem.id ? { ...item, ...updatedItem } : item
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionChannel)
      supabase.removeChannel(itemsChannel)
    }
  }, [session?.id])

  // Handler: Set current estimation item
  const handleCurrentItemChange = async (itemId: string | null) => {
    if (!session) return

    const { error } = await supabase
      .from('sessions')
      .update({
        current_estimation_item_id: itemId,
        estimation_revealed: false, // Reset reveal state when changing items
      } as never)
      .eq('id', session.id)

    if (error) {
      console.error('Error updating current item:', error)
    } else {
      setSession(prev => prev ? {
        ...prev,
        current_estimation_item_id: itemId,
        estimation_revealed: false,
      } : null)
    }
  }

  // Handler: Start estimation (select first unestimated item)
  const handleStartEstimation = () => {
    const sortedItems = [...itemsToEstimate].sort((a, b) => {
      const posA = a.backlog_position ?? a.position
      const posB = b.backlog_position ?? b.position
      return posA - posB
    })

    const firstUnestimated = sortedItems.find(
      item => item.story_points === null || item.story_points === undefined
    )

    if (firstUnestimated) {
      handleCurrentItemChange(firstUnestimated.id)
    }
  }

  // Handler: Reset and restart estimation (clears story points for all items)
  const handleResetAndRestartEstimation = async () => {
    if (!session) return

    // Get all item IDs to reset
    const itemIds = itemsToEstimate.map(item => item.id)

    // Reset story points to null in database
    const { error: updateError } = await supabase
      .from('items')
      .update({ story_points: null } as never)
      .in('id', itemIds)

    if (updateError) {
      console.error('Error resetting story points:', updateError)
      return
    }

    // Update local state
    setAllItems(prevItems =>
      prevItems.map(item =>
        itemIds.includes(item.id) ? { ...item, story_points: null } : item
      )
    )

    // Start estimation with first item
    const sortedItems = [...itemsToEstimate].sort((a, b) => {
      const posA = a.backlog_position ?? a.position
      const posB = b.backlog_position ?? b.position
      return posA - posB
    })

    if (sortedItems.length > 0) {
      handleCurrentItemChange(sortedItems[0].id)
    }
  }

  // Handler: Reveal votes
  const handleReveal = async () => {
    if (!session) return

    const { error } = await supabase
      .from('sessions')
      .update({ estimation_revealed: true } as never)
      .eq('id', session.id)

    if (error) {
      console.error('Error revealing votes:', error)
    } else {
      setSession(prev => prev ? { ...prev, estimation_revealed: true } : null)
    }
  }

  // Handler: Accept estimate and save story points
  const handleAccept = async (storyPoints: number) => {
    if (!session || !currentEstimationItemId) return

    // Save story points to item
    const { error: itemError } = await supabase
      .from('items')
      .update({ story_points: storyPoints } as never)
      .eq('id', currentEstimationItemId)

    if (itemError) {
      console.error('Error saving story points:', itemError)
      return
    }

    // Update local state
    setAllItems(prevItems =>
      prevItems.map(item =>
        item.id === currentEstimationItemId
          ? { ...item, story_points: storyPoints }
          : item
      )
    )

    // Clear votes for this item
    await clearVotes()

    // Move to next unestimated item
    if (nextUnestimatedItem) {
      handleCurrentItemChange(nextUnestimatedItem.id)
    } else {
      handleCurrentItemChange(null)
    }
  }

  // Handler: Re-vote (clear votes and reset reveal)
  const handleRevote = async () => {
    if (!session) return

    // Clear votes
    await clearVotes()

    // Reset reveal state
    const { error } = await supabase
      .from('sessions')
      .update({ estimation_revealed: false } as never)
      .eq('id', session.id)

    if (error) {
      console.error('Error resetting reveal state:', error)
    } else {
      setSession(prev => prev ? { ...prev, estimation_revealed: false } : null)
    }
  }

  // Handler: Skip current item
  const handleSkip = () => {
    if (nextUnestimatedItem) {
      handleCurrentItemChange(nextUnestimatedItem.id)
    } else {
      handleCurrentItemChange(null)
    }
  }

  // Handler: Copy estimation URL
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href)
    setNotification('URL copied to clipboard!')
    setTimeout(() => setNotification(null), 2000)
  }

  // Handler: Navigate back to backlog (clears estimation state)
  const handleBackToBacklog = async () => {
    if (session) {
      // Clear estimation item IDs so next estimation starts fresh
      await supabase
        .from('sessions')
        .update({
          estimation_item_ids: [],
          current_estimation_item_id: null,
          estimation_revealed: false,
        } as never)
        .eq('id', session.id)
    }
    navigate(`/s/${slug}`)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading estimation session...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session not found</h2>
          <p className="text-gray-600 mb-6">This session doesn't exist or may have been deleted.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Create New Session
          </button>
        </div>
      </div>
    )
  }

  // Name prompt
  if (needsName) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NamePromptModal onSubmit={setParticipantName} />
      </div>
    )
  }

  // Convert participants to expected format
  const participantsList: Participant[] = participants.map(p => ({
    name: p.name,
    joinedAt: p.joinedAt,
  }))

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile: Back button instead of logo */}
              <button
                onClick={handleBackToBacklog}
                className="sm:hidden p-1.5 -ml-1.5 text-gray-600 hover:text-gray-900"
                aria-label="Back to backlog"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {/* Desktop: Logo */}
              <a href="/" className="hidden sm:block flex-shrink-0">
                <Logo className="w-9 h-9" />
              </a>
              <Breadcrumb
                sessionSlug={slug!}
                sessionName={session.name}
                currentPage="Planning Poker"
                itemCount={itemsToEstimate.length}
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Participant count */}
              {participantsList.length > 0 && (
                <span className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-600">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="hidden sm:inline">{participantsList.length} online</span>
                  <span className="sm:hidden">{participantsList.length}</span>
                </span>
              )}

              {/* Copy URL button */}
              <button
                onClick={handleCopyUrl}
                className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="hidden sm:inline">Share URL</span>
                <span className="sm:hidden">Share</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {notification}
        </div>
      )}

      <main className="max-w-7xl mx-auto">
        {itemsToEstimate.length === 0 ? (
          // No items state
          <div className="flex items-center justify-center min-h-[60vh] p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No items to estimate</h2>
              <p className="text-gray-600 mb-6">
                Select items from the backlog to start estimating, or add some items first.
              </p>
              <button
                onClick={handleBackToBacklog}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Back to Backlog
              </button>
            </div>
          </div>
        ) : (
          // Main estimation view
          <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
            {/* Queue sidebar */}
            <div className="lg:w-80 lg:border-r lg:border-gray-200 p-4 bg-gray-50 lg:bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Estimation Queue
              </h3>
              <EstimationQueue
                items={itemsToEstimate}
                currentItemId={currentEstimationItemId}
                onStartEstimation={handleStartEstimation}
                onSelectItem={handleCurrentItemChange}
              />
            </div>

            {/* Main estimation area */}
            <div className="flex-1 p-4 lg:p-8">
              {currentItem ? (
                <div className="max-w-2xl mx-auto">
                  {/* Current item display */}
                  <CurrentEstimationItem item={currentItem} />

                  {/* Card selection */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                    <EstimationCards
                      selectedValue={selectedVote}
                      onSelect={submitVote}
                    />
                  </div>

                  {/* Participant votes */}
                  <ParticipantVotes
                    participants={participantsList}
                    votes={votes}
                    revealed={estimationRevealed}
                    currentParticipantName={participantName}
                  />

                  {/* Reveal button and results */}
                  <EstimationResults
                    votes={votes}
                    onReveal={handleReveal}
                    onAccept={handleAccept}
                    onRevote={handleRevote}
                    onSkip={handleSkip}
                    revealed={estimationRevealed}
                    hasNextItem={hasNextItem}
                  />
                </div>
              ) : itemsToEstimate.every(item => item.story_points !== null && item.story_points !== undefined) ? (
                /* All items estimated - completion state */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Estimation Complete!
                  </h2>
                  <p className="text-gray-600 mb-6 max-w-sm">
                    You've estimated all {itemsToEstimate.length} item{itemsToEstimate.length !== 1 ? 's' : ''}.
                    The story points have been saved to your backlog.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleResetAndRestartEstimation}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-5 rounded-lg transition-colors"
                    >
                      Re-estimate Items
                    </button>
                    <button
                      onClick={handleBackToBacklog}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors"
                    >
                      Back to Backlog
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty state when no item selected (estimation not started) */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Planning Poker
                  </h2>
                  <p className="text-gray-600 mb-4 max-w-sm">
                    Estimate items collaboratively with your team using Fibonacci story points.
                  </p>
                  <p className="text-sm text-gray-500">
                    Select an item from the queue or click "Start Estimation" to begin.
                  </p>
                  <p className="text-xs text-gray-400 mt-4">
                    Participant: {participantName || 'Anonymous'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
