import { useState } from 'react'

interface NamePromptModalProps {
  onSubmit: (name: string) => void
}

export default function NamePromptModal({ onSubmit }: NamePromptModalProps) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Welcome to Priori!
        </h2>
        <p className="text-gray-600 mb-4">
          Enter your name so others can see who's contributing.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
            autoFocus
            maxLength={50}
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Join Session
          </button>
        </form>
      </div>
    </div>
  )
}
