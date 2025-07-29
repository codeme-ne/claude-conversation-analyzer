import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { FiDownload, FiEye, FiClock, FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'
import AnalysisResults from '../components/AnalysisResults'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatDate } from '../utils/format'

const ResultsPage = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const location = useLocation()
  const { fileName } = location.state || {}
  
  const [analysisState, setAnalysisState] = useState<string>('loading')
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const socketRef = useRef<Socket | null>(null)
  const pollInterval = useRef<NodeJS.Timer | null>(null)

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io()

    // Listen for analysis updates
    if (jobId) {
      socketRef.current.on(`analysis-status-${jobId}`, (data) => {
        console.log('Analysis update:', data)
        if (data.status === 'completed') {
          fetchResults()
        } else if (data.status === 'failed') {
          setError(data.message || 'Analysis failed')
          setAnalysisState('failed')
        } else if (data.status === 'cancelled') {
          setAnalysisState('cancelled')
        }
      })
    }

    // Start polling for status
    startStatusPolling()

    return () => {
      socketRef.current?.disconnect()
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
      }
    }
  }, [jobId])

  const startStatusPolling = () => {
    checkStatus() // Check immediately
    
    pollInterval.current = setInterval(() => {
      checkStatus()
    }, 2000) // Poll every 2 seconds
  }

  const checkStatus = async () => {
    try {
      const response = await axios.get(`/api/analyze/status/${jobId}`)
      const { state, progress, result, failedReason } = response.data
      
      setAnalysisState(state)
      setAnalysisProgress(progress || 0)
      
      if (state === 'completed' && result) {
        setResults(result)
        if (pollInterval.current) {
          clearInterval(pollInterval.current)
        }
        fetchResults() // Fetch full results
      } else if (state === 'failed') {
        setError(failedReason || 'Analysis failed')
        if (pollInterval.current) {
          clearInterval(pollInterval.current)
        }
      }
    } catch (error) {
      console.error('Status check error:', error)
    }
  }

  const fetchResults = async () => {
    try {
      const response = await axios.get(`/api/analyze/results/${jobId}`)
      setResults(response.data)
      setAnalysisState('completed')
    } catch (error) {
      console.error('Error fetching results:', error)
      toast.error('Failed to load results')
    }
  }

  const downloadResults = () => {
    const dataStr = JSON.stringify(results, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `analysis-results-${jobId}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const renderContent = () => {
    switch (analysisState) {
      case 'active':
      case 'waiting':
      case 'loading':
        return (
          <div className="text-center py-12">
            <LoadingSpinner size="large" />
            <h2 className="text-xl font-semibold text-gray-900 mt-4">
              Analyzing File...
            </h2>
            <p className="text-gray-600 mt-2">
              This may take a few minutes for large files
            </p>
            {analysisProgress > 0 && (
              <div className="mt-4">
                <div className="w-64 mx-auto bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">{analysisProgress}% complete</p>
              </div>
            )}
          </div>
        )
      
      case 'completed':
        return results ? (
          <AnalysisResults results={results} />
        ) : (
          <div className="text-center py-12">
            <LoadingSpinner size="large" />
            <p className="text-gray-600 mt-4">Loading results...</p>
          </div>
        )
      
      case 'failed':
        return (
          <div className="card text-center py-12">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900">Analysis Failed</h2>
            <p className="text-gray-600 mt-2">{error || 'An unknown error occurred'}</p>
            <button
              onClick={() => window.history.back()}
              className="btn-primary mt-6"
            >
              Go Back
            </button>
          </div>
        )
      
      case 'cancelled':
        return (
          <div className="card text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900">Analysis Cancelled</h2>
            <p className="text-gray-600 mt-2">The analysis was cancelled</p>
            <button
              onClick={() => window.history.back()}
              className="btn-primary mt-6"
            >
              Go Back
            </button>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analysis Results</h1>
          <p className="text-gray-600">
            {fileName ? `File: ${fileName}` : `Job ID: ${jobId}`}
          </p>
        </div>
        
        {analysisState === 'completed' && results && (
          <button
            onClick={downloadResults}
            className="btn-secondary flex items-center"
          >
            <FiDownload className="mr-2" />
            Download Results
          </button>
        )}
      </div>

      {renderContent()}
    </div>
  )
}

export default ResultsPage