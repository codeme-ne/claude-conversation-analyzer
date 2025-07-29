import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

interface UploadSession {
  uploadId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  uploadedChunks: ChunkInfo[];
  createdAt: Date;
}

interface ChunkInfo {
  chunkNumber: number;
  path: string;
  size: number;
}

export class FileUploadService {
  private sessions: Map<string, UploadSession> = new Map();
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(__dirname, '../../../uploads');
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    await fs.mkdir(this.uploadDir, { recursive: true });
    await fs.mkdir(path.join(this.uploadDir, 'chunks'), { recursive: true });
    await fs.mkdir(path.join(this.uploadDir, 'completed'), { recursive: true });
  }

  async createUploadSession(sessionData: Omit<UploadSession, 'createdAt'>): Promise<UploadSession> {
    const session: UploadSession = {
      ...sessionData,
      createdAt: new Date()
    };
    
    this.sessions.set(sessionData.uploadId, session);
    
    // Create chunk directory for this upload
    const chunkDir = path.join(this.uploadDir, 'chunks', sessionData.uploadId);
    await fs.mkdir(chunkDir, { recursive: true });
    
    return session;
  }

  async getUploadSession(uploadId: string): Promise<UploadSession | undefined> {
    return this.sessions.get(uploadId);
  }

  async addChunk(uploadId: string, chunkInfo: ChunkInfo): Promise<void> {
    const session = this.sessions.get(uploadId);
    if (!session) {
      throw new Error('Upload session not found');
    }
    
    // Move chunk to session-specific directory
    const oldPath = chunkInfo.path;
    const newPath = path.join(this.uploadDir, 'chunks', uploadId, `chunk-${chunkInfo.chunkNumber}`);
    await fs.rename(oldPath, newPath);
    
    // Update chunk info with new path
    chunkInfo.path = newPath;
    session.uploadedChunks.push(chunkInfo);
    
    // Sort chunks by number
    session.uploadedChunks.sort((a, b) => a.chunkNumber - b.chunkNumber);
  }

  async mergeChunks(uploadId: string): Promise<string> {
    const session = this.sessions.get(uploadId);
    if (!session) {
      throw new Error('Upload session not found');
    }
    
    // Validate all chunks are present
    if (session.uploadedChunks.length !== session.totalChunks) {
      throw new Error(`Missing chunks: expected ${session.totalChunks}, got ${session.uploadedChunks.length}`);
    }
    
    // Create final file path
    const timestamp = Date.now();
    const safeFileName = session.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalPath = path.join(this.uploadDir, 'completed', `${timestamp}-${safeFileName}`);
    
    // Create write stream for final file
    const writeStream = createWriteStream(finalPath);
    
    try {
      // Merge chunks in order
      for (const chunk of session.uploadedChunks) {
        const readStream = createReadStream(chunk.path);
        await pipeline(readStream, writeStream, { end: false });
      }
      
      // Close the write stream
      writeStream.end();
      
      // Wait for the stream to finish
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      // Verify file size
      const stats = await fs.stat(finalPath);
      if (stats.size !== session.fileSize) {
        throw new Error(`File size mismatch: expected ${session.fileSize}, got ${stats.size}`);
      }
      
      return finalPath;
    } catch (error) {
      // Clean up on error
      try {
        await fs.unlink(finalPath);
      } catch (unlinkError) {
        // Ignore unlink errors
      }
      throw error;
    }
  }

  async cleanupChunks(uploadId: string): Promise<void> {
    const chunkDir = path.join(this.uploadDir, 'chunks', uploadId);
    
    try {
      // Remove all chunks and the directory
      await fs.rm(chunkDir, { recursive: true, force: true });
      
      // Remove session
      this.sessions.delete(uploadId);
    } catch (error) {
      console.error(`Error cleaning up chunks for upload ${uploadId}:`, error);
    }
  }

  async cancelUpload(uploadId: string): Promise<void> {
    const session = this.sessions.get(uploadId);
    if (!session) {
      return;
    }
    
    // Clean up any uploaded chunks
    await this.cleanupChunks(uploadId);
  }

  // Clean up old sessions (older than 24 hours)
  async cleanupOldSessions(): Promise<void> {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [uploadId, session] of this.sessions.entries()) {
      if (now - session.createdAt.getTime() > maxAge) {
        await this.cancelUpload(uploadId);
      }
    }
  }
}