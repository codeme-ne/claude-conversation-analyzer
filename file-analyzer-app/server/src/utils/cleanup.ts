import fs from 'fs/promises';
import path from 'path';

const TEMP_FILE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export async function cleanupTempFiles(): Promise<void> {
  try {
    const uploadsDir = path.join(__dirname, '../../../uploads');
    const chunksDir = path.join(uploadsDir, 'chunks');
    const completedDir = path.join(uploadsDir, 'completed');
    
    // Clean up old chunks
    await cleanupDirectory(chunksDir, TEMP_FILE_MAX_AGE);
    
    // Clean up old completed files (optional, can be adjusted)
    await cleanupDirectory(completedDir, TEMP_FILE_MAX_AGE * 7); // Keep for 7 days
    
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

async function cleanupDirectory(dirPath: string, maxAge: number): Promise<void> {
  try {
    const files = await fs.readdir(dirPath);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        if (stats.isDirectory()) {
          await fs.rm(filePath, { recursive: true, force: true });
        } else {
          await fs.unlink(filePath);
        }
        console.log(`Removed old file/directory: ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`Error cleaning directory ${dirPath}:`, error);
  }
}