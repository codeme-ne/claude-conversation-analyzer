import Bull from 'bull';
import { FileAnalysisService } from '../services/fileAnalysisService';

let analysisQueue: Bull.Queue | null = null;

export function createAnalysisQueue(): Bull.Queue {
  if (analysisQueue) {
    return analysisQueue;
  }

  const redisConfig = {
    port: parseInt(process.env.REDIS_PORT || '6379'),
    host: process.env.REDIS_HOST || '127.0.0.1',
    password: process.env.REDIS_PASSWORD
  };

  analysisQueue = new Bull('file-analysis', {
    redis: redisConfig,
    defaultJobOptions: {
      removeOnComplete: false,
      removeOnFail: false
    }
  });

  // Process jobs
  const fileAnalysisService = new FileAnalysisService();
  
  analysisQueue.process('analyze-file', async (job) => {
    const { jobId, filePath, analysisTypes } = job.data;
    
    // Update progress
    job.progress(0);
    
    try {
      // Perform analysis
      const result = await fileAnalysisService.analyzeFile(jobId, filePath, analysisTypes);
      
      // Update progress
      job.progress(100);
      
      return result;
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    }
  });

  // Event handlers
  analysisQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed:`, result.jobId);
  });

  analysisQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err);
  });

  analysisQueue.on('progress', (job, progress) => {
    console.log(`Job ${job.id} progress: ${progress}%`);
  });

  return analysisQueue;
}