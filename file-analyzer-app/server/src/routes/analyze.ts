import { Router } from 'express';
import { Server } from 'socket.io';
import { FileAnalysisService } from '../services/fileAnalysisService';
import { createAnalysisQueue } from '../workers/analysisQueue';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const fileAnalysisService = new FileAnalysisService();
const analysisQueue = createAnalysisQueue();

// Start file analysis
router.post('/start', async (req, res) => {
  try {
    const { filePath, analysisTypes } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    if (!analysisTypes || !Array.isArray(analysisTypes) || analysisTypes.length === 0) {
      return res.status(400).json({ error: 'At least one analysis type is required' });
    }
    
    const jobId = uuidv4();
    const io = req.app.get('io') as Server;
    
    // Add job to queue
    const job = await analysisQueue.add('analyze-file', {
      jobId,
      filePath,
      analysisTypes
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
    
    // Send initial status
    io.emit(`analysis-status-${jobId}`, {
      jobId,
      status: 'queued',
      message: 'Analysis queued'
    });
    
    res.json({ 
      jobId,
      status: 'queued',
      queuePosition: await job.getWaitingCount()
    });
  } catch (error) {
    console.error('Analysis start error:', error);
    res.status(500).json({ error: 'Failed to start analysis' });
  }
});

// Get analysis status
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await analysisQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const state = await job.getState();
    const progress = job.progress();
    
    res.json({
      jobId,
      state,
      progress,
      result: job.returnvalue,
      failedReason: job.failedReason
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Get analysis results
router.get('/results/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const results = await fileAnalysisService.getAnalysisResults(jobId);
    
    if (!results) {
      return res.status(404).json({ error: 'Results not found' });
    }
    
    res.json(results);
  } catch (error) {
    console.error('Results fetch error:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

// Stream file content (for preview)
router.get('/preview/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { start = 0, end = 1000 } = req.query;
    
    const preview = await fileAnalysisService.getFilePreview(
      jobId,
      parseInt(start as string),
      parseInt(end as string)
    );
    
    if (!preview) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(preview);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Failed to get preview' });
  }
});

// Cancel analysis
router.delete('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await analysisQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    await job.remove();
    
    const io = req.app.get('io') as Server;
    io.emit(`analysis-status-${jobId}`, {
      jobId,
      status: 'cancelled',
      message: 'Analysis cancelled'
    });
    
    res.json({ success: true, message: 'Analysis cancelled' });
  } catch (error) {
    console.error('Cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel analysis' });
  }
});

// Get available analysis types
router.get('/types', (req, res) => {
  const analysisTypes = [
    {
      id: 'basic',
      name: 'Basic Information',
      description: 'File size, type, creation date, etc.'
    },
    {
      id: 'content',
      name: 'Content Analysis',
      description: 'Character count, line count, encoding detection'
    },
    {
      id: 'structure',
      name: 'Structure Analysis',
      description: 'File structure, sections, patterns'
    },
    {
      id: 'statistics',
      name: 'Statistical Analysis',
      description: 'Word frequency, character distribution'
    },
    {
      id: 'hash',
      name: 'Hash Calculation',
      description: 'MD5, SHA1, SHA256 checksums'
    },
    {
      id: 'metadata',
      name: 'Metadata Extraction',
      description: 'Extract metadata from various file types'
    }
  ];
  
  res.json(analysisTypes);
});

export { router as analyzeRouter };