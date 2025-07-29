interface ProgressBarProps {
  progress: number
  className?: string
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, className = '' }) => {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-3 overflow-hidden ${className}`}>
      <div
        className="h-full bg-primary-600 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      >
        <div className="h-full bg-gradient-to-r from-primary-600 to-primary-500 animate-pulse-slow" />
      </div>
    </div>
  )
}

export default ProgressBar