import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Session, Item, Framework } from '../types/database'
import ItemForm from '../components/ItemForm'
import ItemList from '../components/ItemList'
import ItemEditModal from '../components/ItemEditModal'
import FrameworkSelector from '../components/FrameworkSelector'

export default function SessionPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<Item | null>(null)

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
        await fetchItems(sessionData.id)
      } catch (err) {
        console.error('Error fetching session:', err)
        setError('Failed to load session')
      } finally {
        setLoading(false)
      }
    }

    const fetchItems = async (sessionId: string) => {
      const { data, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('session_id', sessionId)
        .order('position', { ascending: true })

      if (itemsError) {
        console.error('Error fetching items:', itemsError)
        return
      }

      setItems((data as Item[]) || [])
    }

    fetchSession()
  }, [slug, navigate])

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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Session not found'}
          </h2>
          <p className="text-gray-600 mb-6">
            This session doesn't exist or the URL is incorrect.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Create New Session
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {session.name || 'Untitled Session'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Session: {session.slug}
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                alert('Session URL copied to clipboard!')
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Copy URL
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Item Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <FrameworkSelector
                value={session.framework}
                onChange={handleFrameworkChange}
              />
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Add New Item
              </h2>
              <ItemForm onAdd={handleAddItem} />
            </div>
          </div>

          {/* Items List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Items ({items.length})
                </h2>
              </div>
              <ItemList
                items={items}
                onEdit={setEditingItem}
                onDelete={handleDeleteItem}
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
    </div>
  )
}
