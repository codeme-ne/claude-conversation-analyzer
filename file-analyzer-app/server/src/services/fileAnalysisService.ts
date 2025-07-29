import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import crypto from 'crypto';
import { fileTypeFromFile } from 'file-type';
import path from 'path';

interface AnalysisResult {
  jobId: string;
  filePath: string;
  basic?: BasicInfo;
  content?: ContentAnalysis;
  structure?: StructureAnalysis;
  statistics?: StatisticalAnalysis;
  hash?: HashInfo;
  metadata?: any;
}

interface BasicInfo {
  fileName: string;
  fileSize: number;
  fileSizeReadable: string;
  fileType: string;
  mimeType?: string;
  extension: string;
  createdAt: Date;
  modifiedAt: Date;
  accessedAt: Date;
}

interface ContentAnalysis {
  encoding: string;
  lineCount: number;
  characterCount: number;
  wordCount: number;
  emptyLineCount: number;
  averageLineLength: number;
}

interface StructureAnalysis {
  sections: any[];
  patterns: any[];
  format?: string;
}

interface StatisticalAnalysis {
  mostCommonWords: Array<{ word: string; count: number }>;
  characterDistribution: Record<string, number>;
  lineDistribution: {
    shortest: number;
    longest: number;
    average: number;
    median: number;
  };
}

interface HashInfo {
  md5: string;
  sha1: string;
  sha256: string;
}

export class FileAnalysisService {
  private results: Map<string, AnalysisResult> = new Map();

  async analyzeFile(jobId: string, filePath: string, analysisTypes: string[]): Promise<AnalysisResult> {
    const result: AnalysisResult = {
      jobId,
      filePath
    };

    // Run requested analyses
    for (const type of analysisTypes) {
      switch (type) {
        case 'basic':
          result.basic = await this.getBasicInfo(filePath);
          break;
        case 'content':
          result.content = await this.analyzeContent(filePath);
          break;
        case 'structure':
          result.structure = await this.analyzeStructure(filePath);
          break;
        case 'statistics':
          result.statistics = await this.analyzeStatistics(filePath);
          break;
        case 'hash':
          result.hash = await this.calculateHashes(filePath);
          break;
        case 'metadata':
          result.metadata = await this.extractMetadata(filePath);
          break;
      }
    }

    // Store results
    this.results.set(jobId, result);
    
    return result;
  }

  async getBasicInfo(filePath: string): Promise<BasicInfo> {
    const stats = await fs.stat(filePath);
    const fileType = await fileTypeFromFile(filePath);
    const fileName = path.basename(filePath);
    const extension = path.extname(fileName);

    return {
      fileName,
      fileSize: stats.size,
      fileSizeReadable: this.formatFileSize(stats.size),
      fileType: fileType?.ext || 'unknown',
      mimeType: fileType?.mime,
      extension: extension || 'none',
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      accessedAt: stats.atime
    };
  }

  async analyzeContent(filePath: string): Promise<ContentAnalysis> {
    let lineCount = 0;
    let characterCount = 0;
    let wordCount = 0;
    let emptyLineCount = 0;
    let totalLineLength = 0;

    const countStream = new Transform({
      transform(chunk, encoding, callback) {
        const text = chunk.toString();
        characterCount += text.length;
        
        const lines = text.split('\n');
        lineCount += lines.length - 1;
        
        lines.forEach(line => {
          if (line.trim() === '') {
            emptyLineCount++;
          } else {
            totalLineLength += line.length;
            wordCount += line.split(/\s+/).filter(word => word.length > 0).length;
          }
        });
        
        callback(null, chunk);
      }
    });

    const readStream = createReadStream(filePath, { encoding: 'utf8' });
    await pipeline(readStream, countStream);

    return {
      encoding: 'utf8', // TODO: Detect actual encoding
      lineCount,
      characterCount,
      wordCount,
      emptyLineCount,
      averageLineLength: lineCount > 0 ? Math.round(totalLineLength / (lineCount - emptyLineCount)) : 0
    };
  }

  async analyzeStructure(filePath: string): Promise<StructureAnalysis> {
    // Basic structure analysis - can be extended based on file type
    const fileType = await fileTypeFromFile(filePath);
    
    return {
      sections: [],
      patterns: [],
      format: fileType?.ext
    };
  }

  async analyzeStatistics(filePath: string): Promise<StatisticalAnalysis> {
    const wordFrequency: Map<string, number> = new Map();
    const characterFrequency: Record<string, number> = {};
    const lineLengths: number[] = [];

    const statsStream = new Transform({
      transform(chunk, encoding, callback) {
        const text = chunk.toString();
        const lines = text.split('\n');
        
        lines.forEach(line => {
          if (line.length > 0) {
            lineLengths.push(line.length);
            
            // Count words
            const words = line.toLowerCase().split(/\W+/).filter(word => word.length > 3);
            words.forEach(word => {
              wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
            });
            
            // Count characters
            for (const char of line) {
              if (char.match(/[a-zA-Z]/)) {
                const key = char.toLowerCase();
                characterFrequency[key] = (characterFrequency[key] || 0) + 1;
              }
            }
          }
        });
        
        callback(null, chunk);
      }
    });

    const readStream = createReadStream(filePath, { encoding: 'utf8', highWaterMark: 64 * 1024 });
    await pipeline(readStream, statsStream);

    // Get top 10 most common words
    const sortedWords = Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    // Calculate line statistics
    lineLengths.sort((a, b) => a - b);
    const lineStats = {
      shortest: lineLengths[0] || 0,
      longest: lineLengths[lineLengths.length - 1] || 0,
      average: lineLengths.length > 0 ? Math.round(lineLengths.reduce((a, b) => a + b, 0) / lineLengths.length) : 0,
      median: lineLengths.length > 0 ? lineLengths[Math.floor(lineLengths.length / 2)] : 0
    };

    return {
      mostCommonWords: sortedWords,
      characterDistribution: characterFrequency,
      lineDistribution: lineStats
    };
  }

  async calculateHashes(filePath: string): Promise<HashInfo> {
    const md5 = crypto.createHash('md5');
    const sha1 = crypto.createHash('sha1');
    const sha256 = crypto.createHash('sha256');

    const hashStream = new Transform({
      transform(chunk, encoding, callback) {
        md5.update(chunk);
        sha1.update(chunk);
        sha256.update(chunk);
        callback(null, chunk);
      }
    });

    const readStream = createReadStream(filePath);
    await pipeline(readStream, hashStream);

    return {
      md5: md5.digest('hex'),
      sha1: sha1.digest('hex'),
      sha256: sha256.digest('hex')
    };
  }

  async extractMetadata(filePath: string): Promise<any> {
    // Basic metadata - can be extended with specialized libraries
    const fileType = await fileTypeFromFile(filePath);
    
    return {
      detectedType: fileType,
      // Add more metadata extraction based on file type
    };
  }

  async getFilePreview(jobId: string, start: number = 0, end: number = 1000): Promise<any> {
    const result = this.results.get(jobId);
    if (!result) return null;

    const readStream = createReadStream(result.filePath, {
      encoding: 'utf8',
      start,
      end
    });

    let content = '';
    for await (const chunk of readStream) {
      content += chunk;
    }

    return {
      content,
      start,
      end,
      truncated: end < (result.basic?.fileSize || 0)
    };
  }

  async getAnalysisResults(jobId: string): Promise<AnalysisResult | null> {
    return this.results.get(jobId) || null;
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}