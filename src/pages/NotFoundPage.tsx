import { Link } from 'react-router-dom'

function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="notfound-brand-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#notfound-brand-gradient)" />
      <path d="M24 12L36 34H12L24 12Z" fill="white" />
    </svg>
  )
}

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4 font-body">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <Logo className="w-16 h-16 mx-auto mb-6" />
        <h1 className="text-6xl font-display font-bold text-gray-300 mb-2">404</h1>
        <h2 className="text-xl font-display font-semibold text-gray-900 mb-2">
          Page not found
        </h2>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist or the session may have been deleted.
        </p>
        <Link
          to="/"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-600/30"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
