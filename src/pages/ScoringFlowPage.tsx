import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Session, Item, ItemWithScore, Framework, Score } from '../types/database'
import { calculateRiceScore } from '../lib/rice'
import { calculateIceScore } from '../lib/ice'
import { getQuadrant } from '../lib/valueEffort'
import { calculateWeightedScore, type WeightedCriterion, type WeightedItemScores } from '../lib/weighted'
import Breadcrumb from '../components/Breadcrumb'
import RiceScoring from '../components/RiceScoring'
import IceScoring from '../components/IceScoring'
import ValueEffortScoring from '../components/ValueEffortScoring'
import MoscowScoring from '../components/MoscowScoring'
import WeightedScoring from '../components/WeightedScoring'

type RiceScores = { reach: number; impact: number; confidence: number; effort: number }
type IceScores = { impact: number; confidence: number; ease: number }
type ValueEffortScores = { value: number; effort: number }
type MoscowScores = { category: string }
type WeightedScores = { scores: WeightedItemScores }

const FRAMEWORK_NAMES: Record<Framework, string> = {
  rice: 'RICE',
  ice: 'ICE',
  value_effort: 'Value vs Effort',
  moscow: 'MoSCoW',
  weighted: 'Weighted Scoring',
}

const FRAMEWORK_DESCRIPTIONS: Record<Framework, string> = {
  rice: 'Score by Reach, Impact, Confidence and Effort',
  ice: 'Score by Impact, Confidence and Ease (1-10 scale)',
  value_effort: 'Plot items on a Value vs Effort matrix',
  moscow: 'Categorise as Must, Should, Could or Won\'t',
  weighted: 'Create custom criteria with weights',
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
        <linearGradient id="scoring-logo-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#scoring-logo-gradient)" />
      <path d="M24 12L36 34H12L24 12Z" fill="white" />
    </svg>
  )
}

export default function ScoringFlowPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Get selected item IDs from navigation state (passed from BacklogList)
  const selectedItemIds = (location.state as { selectedItemIds?: string[] })?.selectedItemIds || []

  const [session, setSession] = useState<Session | null>(null)
  const [allItems, setAllItems] = useState<ItemWithScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Scoring flow state
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [showFrameworkSelector, setShowFrameworkSelector] = useState(false)
  const [updatingScore, setUpdatingScore] = useState(false)

  // Get items to score (either selected items or all items)
  const itemsToScore = selectedItemIds.length > 0
    ? allItems.filter(item => selectedItemIds.includes(item.id))
    : allItems

  const currentItem = itemsToScore[currentItemIndex]
  const isComplete = currentItemIndex >= itemsToScore.length

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

      // Show framework selector if no framework is set
      if (!session.framework) {
        setShowFrameworkSelector(true)
      }

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('session_id', session.id)
        .order('position', { ascending: true })

      if (itemsError) throw itemsError

      const items = (itemsData as Item[]) || []

      // Fetch scores for all items
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

  // Subscribe to real-time score updates
  useEffect(() => {
    if (!session) return

    const scoresChannel = supabase
      .channel(`scores:scoring_flow_${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
        },
        async (payload) => {
          const scoreData = (payload.new || payload.old) as Score
          if (!scoreData?.item_id) return

          // Check if item belongs to this session
          const { data } = await supabase
            .from('items')
            .select('id')
            .eq('id', scoreData.item_id)
            .eq('session_id', session.id)
            .single()
          if (!data) return

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newScore = payload.new as Score
            if (newScore.framework !== session.framework) return

            setAllItems(prevItems =>
              prevItems.map(item =>
                item.id === newScore.item_id
                  ? { ...item, score: newScore }
                  : item
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(scoresChannel)
    }
  }, [session])

  // Handle framework selection
  const handleFrameworkSelect = async (framework: Framework) => {
    if (!session) return

    const { error } = await supabase
      .from('sessions')
      .update({ framework } as never)
      .eq('id', session.id)

    if (error) {
      console.error('Error updating framework:', error)
      return
    }

    setSession({ ...session, framework })
    setShowFrameworkSelector(false)

    // Refetch items with scores for new framework
    fetchData()
  }

  // Get default scores for an item
  const getDefaultScores = (item: ItemWithScore, framework: Framework) => {
    if (item.score?.criteria) {
      return item.score.criteria
    }

    switch (framework) {
      case 'rice':
        return { reach: 100, impact: 1, confidence: 0.8, effort: 1 }
      case 'ice':
        return { impact: 5, confidence: 5, ease: 5 }
      case 'value_effort':
        return { value: 5, effort: 5 }
      case 'moscow':
        return { category: 'must' }
      case 'weighted':
        return { scores: {} }
      default:
        return {}
    }
  }

  // Calculate score based on framework
  const calculateScore = (scores: Record<string, unknown>, framework: Framework): number => {
    if (framework === 'rice') {
      return calculateRiceScore(scores as RiceScores)
    } else if (framework === 'ice') {
      return calculateIceScore(scores as IceScores)
    } else if (framework === 'value_effort') {
      return 0 // Quadrant-based, no single score
    } else if (framework === 'moscow') {
      return 0 // Categorical, no numeric score
    } else if (framework === 'weighted' && session?.weighted_criteria) {
      const itemScores = (scores as WeightedScores).scores || {}
      return calculateWeightedScore(session.weighted_criteria as WeightedCriterion[], itemScores)
    }
    return 0
  }

  // Handle score update
  const handleScoreUpdate = async (
    itemId: string,
    scores: RiceScores | IceScores | ValueEffortScores | MoscowScores | WeightedScores
  ) => {
    if (!session) return

    setUpdatingScore(true)

    const calculatedScore = calculateScore(scores as Record<string, unknown>, session.framework)

    // Check if score exists
    const existingScore = allItems.find(item => item.id === itemId)?.score

    if (existingScore) {
      // Update existing score
      const { error } = await supabase
        .from('scores')
        .update({
          criteria: scores,
          calculated_score: calculatedScore,
        } as never)
        .eq('id', existingScore.id)

      if (error) {
        console.error('Error updating score:', error)
      }
    } else {
      // Create new score
      const { data, error } = await supabase
        .from('scores')
        .insert([{
          item_id: itemId,
          framework: session.framework,
          criteria: scores,
          calculated_score: calculatedScore,
        } as never])
        .select()
        .single()

      if (error) {
        console.error('Error creating score:', error)
      } else {
        // Update local state with new score
        setAllItems(prevItems =>
          prevItems.map(item =>
            item.id === itemId
              ? { ...item, score: data as Score }
              : item
          )
        )
      }
    }

    setUpdatingScore(false)
  }

  // Navigation handlers
  const handleNext = () => {
    if (currentItemIndex < itemsToScore.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1)
    } else {
      setCurrentItemIndex(itemsToScore.length) // Mark as complete
    }
  }

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1)
    }
  }

  const handleSkip = () => {
    handleNext()
  }

  const handleBackToBacklog = () => {
    navigate(`/s/${slug}`)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scoring session...</p>
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

  // Framework selector
  if (showFrameworkSelector || !session.framework) {
    return (
      <div className="min-h-screen bg-gray-50 font-body">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <a href="/" className="flex-shrink-0">
                <Logo className="w-9 h-9" />
              </a>
              <Breadcrumb
                sessionSlug={slug!}
                sessionName={session.name}
                currentPage="Select Framework"
              />
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-display font-semibold text-gray-900">
                Choose a Scoring Framework
              </h2>
              {session.framework && (
                <button
                  onClick={() => setShowFrameworkSelector(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              )}
            </div>
            <p className="text-gray-600 mb-6">
              Select how you want to prioritise your items.{session.framework ? ` Currently using ${FRAMEWORK_NAMES[session.framework]}.` : ''}
            </p>

            <div className="space-y-3">
              {(Object.keys(FRAMEWORK_NAMES) as Framework[]).map(framework => (
                <button
                  key={framework}
                  onClick={() => handleFrameworkSelect(framework)}
                  className={`w-full text-left p-4 border rounded-lg transition-colors group ${
                    framework === session.framework
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-semibold group-hover:text-indigo-700 ${
                        framework === session.framework ? 'text-indigo-700' : 'text-gray-900'
                      }`}>
                        {FRAMEWORK_NAMES[framework]}
                        {framework === session.framework && (
                          <span className="ml-2 text-xs font-normal text-indigo-600">(current)</span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {FRAMEWORK_DESCRIPTIONS[framework]}
                      </p>
                    </div>
                    <svg
                      className={`w-5 h-5 group-hover:text-indigo-600 ${
                        framework === session.framework ? 'text-indigo-600' : 'text-gray-400'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // No items to score
  if (itemsToScore.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 font-body">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <a href="/" className="flex-shrink-0">
                <Logo className="w-9 h-9" />
              </a>
              <Breadcrumb
                sessionSlug={slug!}
                sessionName={session.name}
                currentPage="Scoring"
              />
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No items to score</h2>
            <p className="text-gray-600 mb-6">
              Select items from the backlog to start scoring, or add some items first.
            </p>
            <button
              onClick={handleBackToBacklog}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Back to Backlog
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Completion screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-50 font-body">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <a href="/" className="flex-shrink-0">
                <Logo className="w-9 h-9" />
              </a>
              <Breadcrumb
                sessionSlug={slug!}
                sessionName={session.name}
                currentPage="Scoring Complete"
              />
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Scoring Complete!</h2>
            <p className="text-gray-600 mb-6">
              You've scored {itemsToScore.length} {itemsToScore.length === 1 ? 'item' : 'items'} using {FRAMEWORK_NAMES[session.framework]}.
            </p>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-gray-900 mb-3">Summary</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {itemsToScore.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate flex-1 mr-4">
                      {index + 1}. {item.title}
                    </span>
                    {item.score?.calculated_score !== undefined && session.framework !== 'moscow' && session.framework !== 'value_effort' && (
                      <span className="font-medium text-indigo-600">
                        {item.score.calculated_score.toFixed(1)}
                      </span>
                    )}
                    {session.framework === 'value_effort' && item.score?.criteria && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        {getQuadrant(item.score.criteria as ValueEffortScores)}
                      </span>
                    )}
                    {session.framework === 'moscow' && item.score?.criteria && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200">
                        {({ must: 'Must Have', should: 'Should Have', could: 'Could Have', wont: "Won't Have" } as Record<string, string>)[item.score.criteria.category as string] || String(item.score.criteria.category)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setCurrentItemIndex(0)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Score Again
              </button>
              <button
                onClick={handleBackToBacklog}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Back to Backlog
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Main scoring interface
  const defaultScores = getDefaultScores(currentItem, session.framework)

  return (
    <div className="min-h-screen bg-gray-50 font-body flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
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
                currentPage="Scoring"
                itemCount={itemsToScore.length}
              />
            </div>

            {/* Framework selector - smaller on mobile */}
            <button
              onClick={() => setShowFrameworkSelector(true)}
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors"
              title="Change framework"
            >
              <span className="hidden sm:inline">{FRAMEWORK_NAMES[session.framework]}</span>
              <span className="sm:hidden">{session.framework.toUpperCase()}</span>
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 sm:pb-8">
        {/* Progress indicator */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-2">
            <span>Item {currentItemIndex + 1} of {itemsToScore.length}</span>
            <span>{Math.round(((currentItemIndex + 1) / itemsToScore.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
            <div
              className="bg-indigo-600 h-1.5 sm:h-2 rounded-full transition-[width] duration-300"
              style={{ width: `${((currentItemIndex + 1) / itemsToScore.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current item card */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-display font-semibold text-gray-900 mb-2">
            {currentItem.title}
          </h2>
          {currentItem.description && (
            <p className="text-sm sm:text-base text-gray-600 mb-4">{currentItem.description}</p>
          )}

          {/* Scoring controls */}
          <div className="mt-4">
            {session.framework === 'rice' && (
              <RiceScoring
                {...(defaultScores as RiceScores)}
                onChange={(scores) => handleScoreUpdate(currentItem.id, scores)}
                isUpdating={updatingScore}
              />
            )}
            {session.framework === 'ice' && (
              <IceScoring
                {...(defaultScores as IceScores)}
                onChange={(scores) => handleScoreUpdate(currentItem.id, scores)}
                isUpdating={updatingScore}
              />
            )}
            {session.framework === 'value_effort' && (
              <ValueEffortScoring
                {...(defaultScores as ValueEffortScores)}
                onChange={(scores) => handleScoreUpdate(currentItem.id, scores)}
                isUpdating={updatingScore}
              />
            )}
            {session.framework === 'moscow' && (
              <MoscowScoring
                category={(defaultScores as MoscowScores).category}
                onChange={(scores) => handleScoreUpdate(currentItem.id, scores)}
                isUpdating={updatingScore}
              />
            )}
            {session.framework === 'weighted' && (
              <WeightedScoring
                criteria={session.weighted_criteria || []}
                scores={(defaultScores as WeightedScores).scores}
                onChange={(scores) => handleScoreUpdate(currentItem.id, scores)}
                isUpdating={updatingScore}
              />
            )}
          </div>
        </div>

        {/* Desktop: Navigation buttons inline */}
        <div className="hidden sm:flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentItemIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <button
            onClick={handleSkip}
            className="px-4 py-2 text-gray-500 font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Skip
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {currentItemIndex === itemsToScore.length - 1 ? 'Finish' : 'Next'}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Quick item navigation - hidden on mobile */}
        <div className="hidden sm:block mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Jump to item</h3>
          <div className="flex flex-wrap gap-2">
            {itemsToScore.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setCurrentItemIndex(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  index === currentItemIndex
                    ? 'bg-indigo-600 text-white'
                    : item.score
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={item.title}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Mobile: Fixed bottom navigation bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between z-50">
        <button
          onClick={handlePrevious}
          disabled={currentItemIndex === 0}
          className="flex items-center gap-1 px-3 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        <button
          onClick={handleSkip}
          className="px-3 py-2 text-gray-500 font-medium rounded-lg hover:bg-gray-100 transition-colors"
        >
          Skip
        </button>

        <button
          onClick={handleNext}
          className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {currentItemIndex === itemsToScore.length - 1 ? 'Finish' : 'Next'}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
