import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { FiCheck, FiSquare, FiCheckSquare } from 'react-icons/fi'
import clsx from 'clsx'

interface AnalysisType {
  id: string
  name: string
  description: string
}

const AnalysisPage = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const { filePath, fileName } = location.state || {}

  useEffect(() => {
    fetchAnalysisTypes()
  }, [])

  const fetchAnalysisTypes = async () => {
    try {
      const response = await axios.get('/api/analyze/types')
      setAnalysisTypes(response.data)
      // Select all types by default
      setSelectedTypes(response.data.map((type: AnalysisType) => type.id))
    } catch (error) {
      console.error('Error fetching analysis types:', error)
      toast.error('Failed to load analysis types')
    }
  }

  const toggleAnalysisType = (typeId: string) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(id => id !== typeId)
      } else {
        return [...prev, typeId]
      }
    })
  }

  const toggleAll = () => {
    if (selectedTypes.length === analysisTypes.length) {
      setSelectedTypes([])
    } else {
      setSelectedTypes(analysisTypes.map(type => type.id))
    }
  }

  const startAnalysis = async () => {
    if (selectedTypes.length === 0) {
      toast.error('Please select at least one analysis type')
      return
    }

    if (!filePath) {
      toast.error('File path not found. Please upload the file again.')
      return
    }

    setIsLoading(true)

    try {
      const response = await axios.post('/api/analyze/start', {
        filePath,
        analysisTypes: selectedTypes
      })

      const { jobId: analysisJobId } = response.data
      toast.success('Analysis started!')
      
      // Navigate to results page
      navigate(`/results/${analysisJobId}`, {
        state: { fileName }
      })
    } catch (error) {
      console.error('Error starting analysis:', error)
      toast.error('Failed to start analysis')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Analysis Types</h1>
      <p className="text-gray-600 mb-8">
        Choose the types of analysis you want to perform on{' '}
        <span className="font-medium">{fileName || 'your file'}</span>
      </p>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Available Analyses</h2>
          <button
            onClick={toggleAll}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {selectedTypes.length === analysisTypes.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="space-y-3">
          {analysisTypes.map(type => {
            const isSelected = selectedTypes.includes(type.id)
            return (
              <div
                key={type.id}
                onClick={() => toggleAnalysisType(type.id)}
                className={clsx(
                  'p-4 rounded-lg border cursor-pointer transition-all',
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    {isSelected ? (
                      <FiCheckSquare className="h-5 w-5 text-primary-600" />
                    ) : (
                      <FiSquare className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="font-medium text-gray-900">{type.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {selectedTypes.length} of {analysisTypes.length} analyses selected
        </p>
        
        <button
          onClick={startAnalysis}
          disabled={isLoading || selectedTypes.length === 0}
          className="btn-primary"
        >
          {isLoading ? 'Starting Analysis...' : 'Start Analysis'}
        </button>
      </div>
    </div>
  )
}

export default AnalysisPage