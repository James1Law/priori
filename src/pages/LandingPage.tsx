import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateSlug } from '../lib/slug'
import { supabase } from '../lib/supabase'

export default function LandingPage() {
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()

  const handleCreateSession = async () => {
    setIsCreating(true)

    try {
      const slug = generateSlug()

      const { error } = await supabase
        .from('sessions')
        .insert({ slug, name: null } as never)

      if (error) throw error

      navigate(`/s/${slug}`)
    } catch (error) {
      console.error('Error creating session:', error)
      alert('Failed to create session. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">Priori</h1>
          <p className="text-xl text-gray-600 mb-2">
            Product Prioritisation Tool
          </p>
          <p className="text-gray-500">
            Collaborative prioritisation made simple. No login required.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Get Started
          </h2>
          <p className="text-gray-600 mb-6">
            Create a new session and share the URL with your team to start
            prioritising together.
          </p>

          <button
            onClick={handleCreateSession}
            disabled={isCreating}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
          >
            {isCreating ? 'Creating Session...' : 'Create New Session'}
          </button>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">Features</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span>Multiple prioritisation frameworks (RICE, ICE, MoSCoW, and more)</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span>Real-time collaboration with your team</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2">✓</span>
                <span>No authentication required - just share the URL</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
