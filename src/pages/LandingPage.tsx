import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateSlug } from '../lib/slug'
import { supabase } from '../lib/supabase'
import FeatureCard from '../components/FeatureCard'

const FRAMEWORKS = [
  'RICE',
  'ICE',
  'Value vs Effort',
  'MoSCoW',
  'Weighted Scoring',
]

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Create a Session',
    description: "Click the button and you're in. No sign-up, no setup.",
  },
  {
    step: 2,
    title: 'Share the Link',
    description:
      'Send the unique URL to your team. Anyone with the link can join.',
  },
  {
    step: 3,
    title: 'Add Your Items',
    description: 'Add features, bugs, or ideas to prioritise together.',
  },
  {
    step: 4,
    title: 'Score, Estimate & Plan',
    description:
      'Use scoring frameworks, run planning poker, plan capacity, and build your roadmap — all in real-time.',
  },
]

const FEATURES = [
  {
    icon: '📊',
    iconBgColor: '#dbeafe',
    title: 'Prioritisation',
    description:
      'RICE, ICE, Value vs Effort, MoSCoW, or create your own weighted criteria. Pick the framework that fits your team.',
  },
  {
    icon: '🃏',
    iconBgColor: '#d1fae5',
    title: 'Poker Planner',
    description:
      'Estimate story points as a team with Fibonacci cards. Reveal votes together and reach consensus faster.',
  },
  {
    icon: '🧩',
    iconBgColor: '#ede9fe',
    title: 'Work Breakdown',
    description:
      'Organise items into Goals, Initiatives, Epics, Stories and Subtasks. Effort and status roll up automatically.',
  },
  {
    icon: '📋',
    iconBgColor: '#fef3c7',
    title: 'Backlog Management',
    description:
      "Drag-and-drop prioritisation with a cutoff line. See what's in and what's out at a glance.",
  },
  {
    icon: '🗺️',
    iconBgColor: '#fce7f3',
    title: 'Visual Roadmap',
    description:
      'Plan work across custom time periods. Drag items onto your timeline and resize them across quarters.',
  },
  {
    icon: '📐',
    iconBgColor: '#ecfdf5',
    title: 'Capacity Planning',
    description:
      'Compare backlog effort against team capacity. Configure team size, working days, and focus factor to see utilisation at a glance.',
  },
  {
    icon: '💬',
    iconBgColor: '#e0e7ff',
    title: 'Team Chat',
    description:
      "Discuss priorities in real-time without leaving the session. See who's typing and never miss a message.",
  },
  {
    icon: '⚡',
    iconBgColor: '#fef9c3',
    title: 'Real-Time Collaboration',
    description:
      'Share a link — no sign-up needed. Changes sync instantly across all participants with live presence indicators.',
  },
]

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
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 font-body">
      {/* Hero Section */}
      <div className="flex items-center justify-center p-4 pt-16 pb-6 md:pt-24 md:pb-6">
        <div className="max-w-2xl w-full">
          <header className="text-center mb-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Logo className="w-12 h-12 md:w-16 md:h-16 drop-shadow-lg" />
              <h1 className="text-4xl md:text-6xl font-display font-bold text-indigo-600">
                Priori
              </h1>
            </div>
            <p className="text-lg md:text-xl text-gray-600 mb-2">
              Product Prioritisation Tool
            </p>
            <p className="text-gray-500 text-sm md:text-base">
              Score, estimate, plan and ship — together in real-time.
            </p>
          </header>

          <section
            className="bg-white rounded-2xl shadow-xl p-8"
            aria-labelledby="get-started-heading"
          >
            <h2
              id="get-started-heading"
              className="text-2xl font-display font-semibold text-gray-800 mb-4"
            >
              Get Started
            </h2>
            <p className="text-gray-600 mb-6">
              Create a new session and share the URL with your team to start
              prioritising together.
            </p>

            <button
              onClick={handleCreateSession}
              disabled={isCreating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 active:scale-[0.97] text-white font-semibold py-4 px-6 rounded-xl transition-[colors,transform] duration-200 ease-out text-lg shadow-lg shadow-indigo-600/30"
            >
              {isCreating ? 'Creating Session...' : 'Create New Session'}
            </button>
          </section>
        </div>
      </div>

      {/* Features Grid */}
      <section className="px-4 pt-6 pb-16 md:pt-6 md:pb-20" aria-labelledby="features-heading">
        <div className="max-w-5xl mx-auto">
          <h2
            id="features-heading"
            className="text-2xl md:text-3xl font-display font-semibold text-gray-800 text-center mb-8"
          >
            Everything you need to prioritise together
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((feature) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                iconBgColor={feature.iconBgColor}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Supported Frameworks Bar */}
      <section className="bg-white py-10 md:py-12" aria-labelledby="frameworks-heading">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h3
            id="frameworks-heading"
            className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-4"
          >
            Supported Frameworks
          </h3>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            {FRAMEWORKS.map((framework) => (
              <span
                key={framework}
                className="bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors duration-200"
              >
                {framework}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        className="px-4 py-16 md:py-20"
        aria-labelledby="how-it-works-heading"
      >
        <div className="max-w-3xl mx-auto">
          <h2
            id="how-it-works-heading"
            className="text-2xl md:text-3xl font-display font-semibold text-gray-800 text-center mb-12"
          >
            How It Works
          </h2>
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-5 md:left-6 top-10 bottom-10 w-0.5 bg-indigo-100" />

            <div className="space-y-8">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step} className="flex gap-4 md:gap-6">
                  <div className="relative z-10 flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-lg md:text-xl">
                    {item.step}
                  </div>
                  <div className="pt-1 md:pt-2">
                    <h3 className="text-lg md:text-xl font-display font-semibold text-gray-800 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-sm md:text-base">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="bg-gradient-to-b from-white to-purple-50 px-4 py-16 md:py-20"
        aria-labelledby="final-cta-heading"
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2
            id="final-cta-heading"
            className="text-2xl md:text-3xl font-display font-semibold text-gray-800 mb-4"
          >
            Ready to Prioritise Smarter?
          </h2>
          <p className="text-gray-600 mb-8">
            Create a free session in seconds and start collaborating with your
            team.
          </p>
          <button
            onClick={handleCreateSession}
            disabled={isCreating}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 active:scale-[0.97] text-white font-semibold py-4 px-8 rounded-xl transition-[colors,transform] duration-200 ease-out text-lg shadow-lg shadow-indigo-600/30"
          >
            {isCreating ? 'Creating Session...' : 'Create New Session'}
          </button>
          <p className="text-gray-500 text-sm mt-4">
            No account needed • Works on any device
          </p>
        </div>
      </section>
    </main>
  )
}
