import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { validateFileSize, validateFileType } from '../utils/validation';
import { FileUploadService } from '../services/fileUploadService';

const router = Router();
const fileUploadService = new FileUploadService();

// Multer configuration for chunk uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/chunks');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB chunks
  }
});

// Initialize chunk upload
router.post('/init', async (req, res) => {
  try {
    const { fileName, fileSize, fileType, totalChunks } = req.body;
    
    // Validate file
    if (!validateFileSize(fileSize)) {
      return res.status(400).json({ 
        error: 'File size must be at least 80MB' 
      });
    }
    
    if (!validateFileType(fileType)) {
      return res.status(400).json({ 
        error: 'Unsupported file type' 
      });
    }
    
    const uploadId = uuidv4();
    const uploadSession = await fileUploadService.createUploadSession({
      uploadId,
      fileName,
      fileSize,
      fileType,
      totalChunks,
      uploadedChunks: []
    });
    
    res.json({ uploadId, session: uploadSession });
  } catch (error) {
    console.error('Upload init error:', error);
    res.status(500).json({ error: 'Failed to initialize upload' });
  }
});

// Upload chunk
router.post('/chunk/:uploadId', upload.single('chunk'), async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { chunkNumber, totalChunks } = req.body;
    const io = req.app.get('io') as Server;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No chunk provided' });
    }
    
    const session = await fileUploadService.getUploadSession(uploadId);
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }
    
    // Store chunk info
    await fileUploadService.addChunk(uploadId, {
      chunkNumber: parseInt(chunkNumber),
      path: req.file.path,
      size: req.file.size
    });
    
    // Calculate progress
    const progress = ((parseInt(chunkNumber) + 1) / parseInt(totalChunks)) * 100;
    
    // Emit progress to client
    io.emit(`upload-progress-${uploadId}`, {
      uploadId,
      progress,
      currentChunk: parseInt(chunkNumber) + 1,
      totalChunks: parseInt(totalChunks)
    });
    
    res.json({ 
      success: true, 
      chunkNumber: parseInt(chunkNumber),
      progress 
    });
  } catch (error) {
    console.error('Chunk upload error:', error);
    res.status(500).json({ error: 'Failed to upload chunk' });
  }
});

// Complete upload and merge chunks
router.post('/complete/:uploadId', async (req, res) => {
  try {
    const { uploadId } = req.params;
    const io = req.app.get('io') as Server;
    
    const session = await fileUploadService.getUploadSession(uploadId);
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }
    
    // Merge chunks
    io.emit(`upload-progress-${uploadId}`, {
      uploadId,
      status: 'merging',
      message: 'Merging file chunks...'
    });
    
    const finalPath = await fileUploadService.mergeChunks(uploadId);
    
    // Clean up chunks
    await fileUploadService.cleanupChunks(uploadId);
    
    io.emit(`upload-progress-${uploadId}`, {
      uploadId,
      status: 'completed',
      message: 'Upload completed successfully',
      filePath: finalPath
    });
    
    res.json({ 
      success: true, 
      filePath: finalPath,
      fileInfo: {
        name: session.fileName,
        size: session.fileSize,
        type: session.fileType
      }
    });
  } catch (error) {
    console.error('Upload completion error:', error);
    res.status(500).json({ error: 'Failed to complete upload' });
  }
});

// Cancel upload
router.delete('/:uploadId', async (req, res) => {
  try {
    const { uploadId } = req.params;
    
    await fileUploadService.cancelUpload(uploadId);
    
    res.json({ success: true, message: 'Upload cancelled' });
  } catch (error) {
    console.error('Upload cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel upload' });
  }
});

export { router as uploadRouter };