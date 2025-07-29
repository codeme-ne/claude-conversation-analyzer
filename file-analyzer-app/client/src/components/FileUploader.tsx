import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import ProgressBar from './ProgressBar'
import { formatFileSize } from '../utils/format'

interface FileUploaderProps {
  file: File
  onUploadStart: () => void
  onUploadComplete: (uploadId: string, filePath: string) => void
  onUploadError: (error: Error) => void
}

const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB chunks

const FileUploader: React.FC<FileUploaderProps> = ({
  file,
  onUploadStart,
  onUploadComplete,
  onUploadError
}) => {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadId, setUploadId] = useState<string | null>(null)
  
  const socketRef = useRef<Socket | null>(null)
  const uploadStartTime = useRef<number>(0)
  const uploadedBytes = useRef<number>(0)

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io()

    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  useEffect(() => {
    if (uploadId && socketRef.current) {
      // Listen for upload progress updates
      socketRef.current.on(`upload-progress-${uploadId}`, (data) => {
        if (data.progress) {
          setUploadProgress(data.progress)
        }
        if (data.status === 'completed') {
          handleUploadComplete(data.filePath)
        }
      })

      return () => {
        socketRef.current?.off(`upload-progress-${uploadId}`)
      }
    }
  }, [uploadId])

  const calculateChunks = () => {
    const chunks = Math.ceil(file.size / CHUNK_SIZE)
    return chunks
  }

  const handleUploadComplete = (filePath: string) => {
    setIsUploading(false)
    setUploadProgress(100)
    if (uploadId) {
      onUploadComplete(uploadId, filePath)
    }
  }

  const uploadChunk = async (chunk: Blob, chunkNumber: number, totalChunks: number): Promise<void> => {
    const formData = new FormData()
    formData.append('chunk', chunk)
    formData.append('chunkNumber', chunkNumber.toString())
    formData.append('totalChunks', totalChunks.toString())

    await axios.post(`/api/upload/chunk/${uploadId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    // Update speed calculation
    const currentTime = Date.now()
    const elapsedTime = (currentTime - uploadStartTime.current) / 1000 // seconds
    uploadedBytes.current += chunk.size
    const speed = uploadedBytes.current / elapsedTime // bytes per second
    setUploadSpeed(speed)

    // Calculate remaining time
    const remainingBytes = file.size - uploadedBytes.current
    const estimatedRemainingTime = remainingBytes / speed
    setRemainingTime(Math.ceil(estimatedRemainingTime))
  }

  const startUpload = async () => {
    try {
      setIsUploading(true)
      onUploadStart()
      uploadStartTime.current = Date.now()
      uploadedBytes.current = 0

      // Initialize upload session
      const initResponse = await axios.post('/api/upload/init', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        totalChunks: calculateChunks()
      })

      const { uploadId: newUploadId } = initResponse.data
      setUploadId(newUploadId)

      // Upload chunks
      const totalChunks = calculateChunks()
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)
        
        await uploadChunk(chunk, i, totalChunks)
      }

      // Complete upload
      await axios.post(`/api/upload/complete/${newUploadId}`)
      
    } catch (error) {
      console.error('Upload error:', error)
      setIsUploading(false)
      toast.error('Upload failed. Please try again.')
      onUploadError(error as Error)
    }
  }

  const cancelUpload = async () => {
    if (uploadId) {
      try {
        await axios.delete(`/api/upload/${uploadId}`)
        setIsUploading(false)
        setUploadProgress(0)
        toast.info('Upload cancelled')
      } catch (error) {
        console.error('Cancel error:', error)
      }
    }
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="space-y-4">
      {!isUploading && uploadProgress === 0 && (
        <button
          onClick={startUpload}
          className="btn-primary w-full"
        >
          Start Upload
        </button>
      )}

      {isUploading && (
        <>
          <ProgressBar progress={uploadProgress} />
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>{Math.round(uploadProgress)}% complete</span>
            {uploadSpeed > 0 && (
              <span>{formatFileSize(uploadSpeed)}/s</span>
            )}
          </div>

          {remainingTime !== null && (
            <p className="text-sm text-gray-600">
              Estimated time remaining: {formatTime(remainingTime)}
            </p>
          )}

          <button
            onClick={cancelUpload}
            className="btn-secondary w-full"
          >
            Cancel Upload
          </button>
        </>
      )}

      {uploadProgress === 100 && !isUploading && (
        <div className="text-center">
          <p className="text-green-600 font-medium">Upload complete!</p>
          <p className="text-sm text-gray-600 mt-1">
            Redirecting to analysis options...
          </p>
        </div>
      )}
    </div>
  )
}

export default FileUploader