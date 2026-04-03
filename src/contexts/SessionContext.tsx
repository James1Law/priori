import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Session, Item, ItemWithScore, Score } from '../types/database'
import AppShell from '../components/AppShell'
import NamePromptModal from '../components/NamePromptModal'
import MobileChatModal from '../components/MobileChatModal'
import BottomSheet from '../components/BottomSheet'
import ItemForm from '../components/ItemForm'
import { useParticipantName } from '../hooks/useParticipantName'
import { usePresence } from '../hooks/usePresence'
import { useMessages } from '../hooks/useMessages'
import { useUnreadCount } from '../hooks/useUnreadCount'

interface SessionContextValue {
  session: Session
  items: ItemWithScore[]
  setItems: React.Dispatch<React.SetStateAction<ItemWithScore[]>>
  setSession: React.Dispatch<React.SetStateAction<Session | null>>
  participantName: string | null
  participantCount: number
  participants: { name: string; joinedAt: string }[]
  refetchData: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSessionContext must be used within SessionLayout')
  return ctx
}

export default function SessionLayout() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [items, setItems] = useState<ItemWithScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)

  const { name: participantName, setName: setParticipantName, needsName } = useParticipantName()
  const { participantCount, participants } = usePresence(session?.id || null, participantName)
  const { messages, loading: messagesLoading, sendMessage } = useMessages(session?.id || null, participantName)
  const { unreadCount } = useUnreadCount(session?.id || null, messages, isChatOpen)

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
        if (sessionError.code === 'PGRST116') {
          setError('Session not found')
        } else {
          throw sessionError
        }
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
      setError('Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [slug, navigate])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Realtime subscriptions ──

  useEffect(() => {
    if (!session) return

    const sessionChannel = supabase
      .channel(`session:layout_${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        (payload) => { setSession(payload.new as Session) }
      )
      .subscribe()

    const itemsChannel = supabase
      .channel(`items:layout_${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `session_id=eq.${session.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as Item
            setItems(prev => {
              if (prev.some(i => i.id === newItem.id)) return prev
              return [...prev, newItem]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as Item
            setItems(prev => prev.map(i => i.id === updatedItem.id ? { ...i, ...updatedItem } : i))
          } else if (payload.eventType === 'DELETE') {
            const deletedItem = payload.old as { id: string }
            setItems(prev => prev.filter(i => i.id !== deletedItem.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionChannel)
      supabase.removeChannel(itemsChannel)
    }
  }, [session?.id])

  // ── Add item ──

  const handleAddItem = async (item: { title: string; description?: string }) => {
    if (!session) return
    const position = items.length
    const { data, error: insertError } = await supabase
      .from('items')
      .insert([{
        session_id: session.id,
        title: item.title,
        description: item.description || null,
        position,
        status: 'todo',
        created_by: participantName,
        item_level: 0,
      } as never])
      .select()
      .single()

    if (!insertError && data) {
      setItems(prev => [...prev, data as ItemWithScore])
    }
  }

  // ── Guard states ──

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    const isNetworkError = error === 'Failed to load session'
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isNetworkError ? 'Connection Error' : 'Session not found'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isNetworkError ? 'Unable to connect. Please check your internet connection.' : "This session doesn't exist or may have been deleted."}
          </p>
          {isNetworkError && (
            <button onClick={() => window.location.reload()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg mr-2">
              Try Again
            </button>
          )}
          <button onClick={() => navigate('/')} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg">
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (needsName) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NamePromptModal onSubmit={setParticipantName} />
      </div>
    )
  }

  // ── Render ──

  return (
    <SessionContext.Provider value={{
      session,
      items,
      setItems,
      setSession,
      participantName,
      participantCount,
      participants: participants.map(p => ({ name: p.name, joinedAt: p.joinedAt })),
      refetchData: fetchData,
    }}>
      <AppShell
        slug={slug!}
        sessionName={session.name}
        participantCount={participantCount}
        unreadCount={unreadCount}
        onChatOpen={() => setIsChatOpen(true)}
        onAddItem={() => setIsAddSheetOpen(true)}
        onSessionNameChange={async (name) => {
          await supabase.from('sessions').update({ name } as never).eq('id', session.id)
          setSession(prev => prev ? { ...prev, name } : null)
        }}
      >
        <Outlet />

        <MobileChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          sessionId={session.id}
          currentUser={participantName || 'Anonymous'}
          messages={messages}
          loading={messagesLoading}
          onSendMessage={sendMessage}
        />

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
      </AppShell>
    </SessionContext.Provider>
  )
}
