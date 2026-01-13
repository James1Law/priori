import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateSlug } from '../lib/slug'
import { supabase } from '../lib/supabase'

function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="brand-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#brand-gradient)" />
      <path d="M24 12L36 34H12L24 12Z" fill="white" />
    </svg>
  )
}

export default function LandingPage() {
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()

  const handleCreateSession = async () => {
    setIsCreating(true)

    try {
      const slug = generateSlug()

      const { error } = await supabase
        .from('sessions')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert([{ slug, name: null, framework: 'rice' }] as any)

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
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4 font-body">
      <div className="max-w-2xl w-full">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Logo className="w-16 h-16 drop-shadow-lg" />
            <h1 className="text-6xl font-display font-bold text-indigo-600">Priori</h1>
          </div>
          <p className="text-xl text-gray-600 mb-2">
            Product Prioritisation Tool
          </p>
          <p className="text-gray-500">
            Collaborative prioritisation made simple. No login required.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-xl p-8" aria-labelledby="get-started-heading">
          <h2 id="get-started-heading" className="text-2xl font-display font-semibold text-gray-800 mb-4">
            Get Started
          </h2>
          <p className="text-gray-600 mb-6">
            Create a new session and share the URL with your team to start
            prioritising together.
          </p>

          <button
            onClick={handleCreateSession}
            disabled={isCreating}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 text-lg shadow-lg shadow-indigo-600/30"
          >
            {isCreating ? 'Creating Session...' : 'Create New Session'}
          </button>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">Features</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2 font-bold">✓</span>
                <span>Multiple prioritisation frameworks (RICE, ICE, MoSCoW, and more)</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2 font-bold">✓</span>
                <span>Real-time collaboration with your team</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-600 mr-2 font-bold">✓</span>
                <span>No authentication required - just share the URL</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  )
}
