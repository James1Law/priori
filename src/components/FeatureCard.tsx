interface FeatureCardProps {
  icon: string
  iconBgColor: string
  title: string
  description: string
}

export default function FeatureCard({
  icon,
  iconBgColor,
  title,
  description,
}: FeatureCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md hover:-translate-y-1 transition-transform duration-200 motion-reduce:transition-none">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
        style={{ backgroundColor: iconBgColor }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-display font-semibold text-gray-800 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
