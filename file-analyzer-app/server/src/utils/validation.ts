const MIN_FILE_SIZE = 80 * 1024 * 1024; // 80MB in bytes

const ALLOWED_FILE_TYPES = [
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/gzip',
  'video/mp4',
  'video/x-msvideo',
  'video/quicktime',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream' // For unknown binary files
];

export function validateFileSize(fileSize: number): boolean {
  return fileSize >= MIN_FILE_SIZE;
}

export function validateFileType(mimeType: string): boolean {
  // Allow any file type for now, but can be restricted if needed
  return true; // ALLOWED_FILE_TYPES.includes(mimeType);
}

export function sanitizeFileName(fileName: string): string {
  // Remove any path components and dangerous characters
  const baseName = fileName.split(/[/\\]/).pop() || fileName;
  return baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
}