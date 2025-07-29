import clsx from 'clsx'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  className = '' 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  }

  return (
    <div className={clsx('flex justify-center', className)}>
      <div
        className={clsx(
          'animate-spin rounded-full border-b-2 border-primary-600',
          sizeClasses[size]
        )}
      />
    </div>
  )
}

export default LoadingSpinner