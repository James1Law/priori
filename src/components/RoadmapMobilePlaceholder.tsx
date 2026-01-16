export default function RoadmapMobilePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {/* Desktop icon illustration */}
      <div className="relative mb-6">
        <div className="w-20 h-16 bg-gray-200 rounded-lg relative">
          {/* Monitor stand */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-2 bg-gray-300 rounded-b" />
          {/* Screen content - roadmap bars */}
          <div className="absolute top-2 left-2 right-2 bottom-4 bg-gray-50 rounded flex items-center justify-center gap-1">
            <div className="w-4 h-2 bg-indigo-500 rounded-sm" />
            <div className="w-6 h-2 bg-blue-500 rounded-sm" />
            <div className="w-3 h-2 bg-emerald-500 rounded-sm" />
          </div>
        </div>
      </div>

      <h3 className="font-display text-xl font-semibold text-gray-900 mb-3">
        Roadmap View
      </h3>

      <p className="text-gray-600 text-sm leading-relaxed mb-6 max-w-xs">
        The Roadmap view is optimised for desktop screens. Open this session on
        a computer to plan your timeline.
      </p>

      <div className="bg-indigo-50 rounded-lg px-4 py-3 text-sm text-indigo-700">
        <strong>Tip:</strong> Scoring and Backlog views work great on mobile!
      </div>
    </div>
  )
}
