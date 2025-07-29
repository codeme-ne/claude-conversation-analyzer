import { useState } from 'react'
import { FiFile, FiHash, FiBarChart, FiDatabase, FiInfo, FiCode } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { formatFileSize, formatDate } from '../utils/format'
import clsx from 'clsx'

interface AnalysisResultsProps {
  results: any
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ results }) => {
  const [activeTab, setActiveTab] = useState('basic')

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: FiInfo, show: !!results.basic },
    { id: 'content', label: 'Content', icon: FiFile, show: !!results.content },
    { id: 'statistics', label: 'Statistics', icon: FiBarChart, show: !!results.statistics },
    { id: 'hash', label: 'Checksums', icon: FiHash, show: !!results.hash },
    { id: 'structure', label: 'Structure', icon: FiCode, show: !!results.structure },
    { id: 'metadata', label: 'Metadata', icon: FiDatabase, show: !!results.metadata },
  ].filter(tab => tab.show)

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  const renderBasicInfo = () => {
    if (!results.basic) return null

    const info = results.basic
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">File Name</h3>
            <p className="mt-1 text-lg">{info.fileName}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">File Size</h3>
            <p className="mt-1 text-lg">{info.fileSizeReadable}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">File Type</h3>
            <p className="mt-1 text-lg">{info.fileType} ({info.mimeType || 'unknown'})</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Created</h3>
            <p className="mt-1 text-lg">{formatDate(info.createdAt)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Modified</h3>
            <p className="mt-1 text-lg">{formatDate(info.modifiedAt)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Extension</h3>
            <p className="mt-1 text-lg">{info.extension || 'none'}</p>
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (!results.content) return null

    const content = results.content
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Lines</h3>
            <p className="mt-1 text-2xl font-semibold">{content.lineCount.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Words</h3>
            <p className="mt-1 text-2xl font-semibold">{content.wordCount.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Characters</h3>
            <p className="mt-1 text-2xl font-semibold">{content.characterCount.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500">Avg Line Length</h3>
            <p className="mt-1 text-2xl font-semibold">{content.averageLineLength}</p>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Additional Info</h3>
          <div className="space-y-2">
            <p>Encoding: <span className="font-medium">{content.encoding}</span></p>
            <p>Empty Lines: <span className="font-medium">{content.emptyLineCount.toLocaleString()}</span></p>
          </div>
        </div>
      </div>
    )
  }

  const renderStatistics = () => {
    if (!results.statistics) return null

    const stats = results.statistics
    
    return (
      <div className="space-y-6">
        {stats.mostCommonWords && stats.mostCommonWords.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Most Common Words</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.mostCommonWords}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="word" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {stats.characterDistribution && Object.keys(stats.characterDistribution).length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Character Distribution</h3>
            <div className="grid grid-cols-6 md:grid-cols-13 gap-2">
              {Object.entries(stats.characterDistribution)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([char, count]) => (
                  <div key={char} className="text-center">
                    <div className="text-lg font-mono font-bold">{char}</div>
                    <div className="text-sm text-gray-600">{count}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {stats.lineDistribution && (
          <div>
            <h3 className="text-lg font-medium mb-4">Line Length Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500">Shortest</h4>
                <p className="mt-1 text-xl font-semibold">{stats.lineDistribution.shortest}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500">Longest</h4>
                <p className="mt-1 text-xl font-semibold">{stats.lineDistribution.longest}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500">Average</h4>
                <p className="mt-1 text-xl font-semibold">{stats.lineDistribution.average}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-500">Median</h4>
                <p className="mt-1 text-xl font-semibold">{stats.lineDistribution.median}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderHashes = () => {
    if (!results.hash) return null

    const hashes = results.hash
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">MD5</h3>
          <p className="mt-1 font-mono text-sm bg-gray-100 p-2 rounded break-all">{hashes.md5}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">SHA1</h3>
          <p className="mt-1 font-mono text-sm bg-gray-100 p-2 rounded break-all">{hashes.sha1}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">SHA256</h3>
          <p className="mt-1 font-mono text-sm bg-gray-100 p-2 rounded break-all">{hashes.sha256}</p>
        </div>
      </div>
    )
  }

  const renderStructure = () => {
    if (!results.structure) return null

    return (
      <div>
        <p className="text-gray-600">File format: {results.structure.format || 'Unknown'}</p>
        {results.structure.sections && results.structure.sections.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Sections</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(results.structure.sections, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  const renderMetadata = () => {
    if (!results.metadata) return null

    return (
      <div>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(results.metadata, null, 2)}
        </pre>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicInfo()
      case 'content':
        return renderContent()
      case 'statistics':
        return renderStatistics()
      case 'hash':
        return renderHashes()
      case 'structure':
        return renderStructure()
      case 'metadata':
        return renderMetadata()
      default:
        return null
    }
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'py-2 px-1 border-b-2 font-medium text-sm flex items-center',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card">
        {renderTabContent()}
      </div>
    </div>
  )
}

export default AnalysisResults