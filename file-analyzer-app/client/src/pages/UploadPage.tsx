import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { FiUploadCloud, FiFile, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'
import FileUploader from '../components/FileUploader'
import { formatFileSize } from '../utils/format'

const MIN_FILE_SIZE = 80 * 1024 * 1024 // 80MB

const UploadPage = () => {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      
      if (file.size < MIN_FILE_SIZE) {
        toast.error(`File must be at least 80MB. Selected file is ${formatFileSize(file.size)}`)
        return
      }
      
      setSelectedFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: isUploading
  })

  const handleRemoveFile = () => {
    setSelectedFile(null)
  }

  const handleUploadComplete = (uploadId: string, filePath: string) => {
    toast.success('File uploaded successfully!')
    // Navigate to analysis selection page
    navigate(`/analysis/${uploadId}`, { 
      state: { filePath, fileName: selectedFile?.name }
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Large File</h1>
      <p className="text-gray-600 mb-8">
        Upload files over 80MB for comprehensive analysis. Files are processed using efficient streaming techniques.
      </p>

      {!selectedFile && !isUploading && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive 
              ? 'border-primary-500 bg-primary-50' 
              : 'border-gray-300 hover:border-gray-400 bg-white'
            }
          `}
        >
          <input {...getInputProps()} />
          <FiUploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            {isDragActive ? 'Drop the file here' : 'Drag & drop your file here'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or click to browse
          </p>
          <p className="text-xs text-gray-400">
            Minimum file size: 80MB
          </p>
        </div>
      )}

      {selectedFile && !isUploading && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <FiFile className="h-8 w-8 text-primary-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <FileUploader
            file={selectedFile}
            onUploadStart={() => setIsUploading(true)}
            onUploadComplete={handleUploadComplete}
            onUploadError={() => setIsUploading(false)}
          />
        </div>
      )}

      {isUploading && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            Please keep this page open while your file is uploading. 
            The upload supports resuming if interrupted.
          </p>
        </div>
      )}
    </div>
  )
}

export default UploadPage