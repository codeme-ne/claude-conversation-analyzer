import { Link } from 'react-router-dom'
import { FiUploadCloud, FiCpu, FiBarChart2, FiZap, FiShield, FiTrendingUp } from 'react-icons/fi'

const HomePage = () => {
  const features = [
    {
      icon: FiUploadCloud,
      title: 'Chunk-Based Upload',
      description: 'Upload files over 80MB efficiently with resumable chunk uploads'
    },
    {
      icon: FiCpu,
      title: 'Stream Processing',
      description: 'Process large files without loading them entirely into memory'
    },
    {
      icon: FiBarChart2,
      title: 'Comprehensive Analysis',
      description: 'Get detailed insights including statistics, patterns, and metadata'
    },
    {
      icon: FiZap,
      title: 'Real-time Progress',
      description: 'Track upload and analysis progress with live updates'
    },
    {
      icon: FiShield,
      title: 'Secure Processing',
      description: 'Your files are processed securely and cleaned up automatically'
    },
    {
      icon: FiTrendingUp,
      title: 'Performance Optimized',
      description: 'Leverages worker threads and queues for optimal performance'
    }
  ]

  const analysisTypes = [
    'Basic file information (size, type, dates)',
    'Content analysis (line count, word count, encoding)',
    'Statistical analysis (word frequency, character distribution)',
    'Hash calculation (MD5, SHA1, SHA256)',
    'Structure analysis and pattern detection',
    'Metadata extraction'
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Analyze Large Files with Ease
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Process and analyze files over 80MB efficiently using advanced streaming techniques
          and parallel processing.
        </p>
        <Link to="/upload" className="btn-primary text-lg px-8 py-3">
          Start Analyzing
        </Link>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={index} className="card">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Analysis Types */}
      <div className="card">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Available Analysis Types
        </h2>
        <ul className="space-y-2">
          {analysisTypes.map((type, index) => (
            <li key={index} className="flex items-start">
              <span className="text-primary-600 mr-2">•</span>
              <span className="text-gray-700">{type}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Ready to analyze your large files?
        </h2>
        <p className="text-gray-600 mb-6">
          Upload your file and get comprehensive insights in minutes.
        </p>
        <Link to="/upload" className="btn-primary">
          Upload File Now
        </Link>
      </div>
    </div>
  )
}

export default HomePage