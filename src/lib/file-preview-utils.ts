export interface FilePreviewInfo {
  canPreview: boolean
  previewType: 'image' | 'pdf' | 'text' | 'video' | 'audio' | 'code' | 'none'
  mimeType: string
  extension: string
  maxSize?: number
}

export const PREVIEWABLE_TYPES = {
  // Images
  'image/jpeg': { canPreview: true, previewType: 'image' as const, maxSize: 10 * 1024 * 1024 }, 
  'image/jpg': { canPreview: true, previewType: 'image' as const, maxSize: 10 * 1024 * 1024 },
  'image/png': { canPreview: true, previewType: 'image' as const, maxSize: 10 * 1024 * 1024 },
  'image/gif': { canPreview: true, previewType: 'image' as const, maxSize: 10 * 1024 * 1024 },
  'image/webp': { canPreview: true, previewType: 'image' as const, maxSize: 10 * 1024 * 1024 },
  'image/svg+xml': { canPreview: true, previewType: 'image' as const, maxSize: 5 * 1024 * 1024 },
  'image/bmp': { canPreview: true, previewType: 'image' as const, maxSize: 10 * 1024 * 1024 },
  'image/tiff': { canPreview: true, previewType: 'image' as const, maxSize: 10 * 1024 * 1024 },
  
  // PDFs
  'application/pdf': { canPreview: true, previewType: 'pdf' as const, maxSize: 50 * 1024 * 1024 },
  
  // Text files
  'text/plain': { canPreview: true, previewType: 'text' as const, maxSize: 1 * 1024 * 1024 },
  'text/html': { canPreview: true, previewType: 'text' as const, maxSize: 1 * 1024 * 1024 },
  'text/css': { canPreview: true, previewType: 'text' as const, maxSize: 1 * 1024 * 1024 },
  'text/javascript': { canPreview: true, previewType: 'text' as const, maxSize: 1 * 1024 * 1024 },
  'text/xml': { canPreview: true, previewType: 'text' as const, maxSize: 1 * 1024 * 1024 },
  'text/csv': { canPreview: true, previewType: 'text' as const, maxSize: 1 * 1024 * 1024 },
  'text/markdown': { canPreview: true, previewType: 'text' as const, maxSize: 1 * 1024 * 1024 },
  'text/yaml': { canPreview: true, previewType: 'text' as const, maxSize: 1 * 1024 * 1024 },
  'text/json': { canPreview: true, previewType: 'text' as const, maxSize: 1 * 1024 * 1024 },
  
  // Code files
  'application/json': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/xml': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/javascript': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/typescript': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-python': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-java': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-c++': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-c': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-php': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-ruby': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-go': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-rust': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-swift': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-kotlin': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-scala': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-clojure': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-haskell': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-lua': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-perl': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-shellscript': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-bat': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  'application/x-powershell': { canPreview: true, previewType: 'code' as const, maxSize: 1 * 1024 * 1024 },
  
  // Video files (limited preview support)
  'video/mp4': { canPreview: true, previewType: 'video' as const, maxSize: 100 * 1024 * 1024 },
  'video/webm': { canPreview: true, previewType: 'video' as const, maxSize: 100 * 1024 * 1024 },
  'video/ogg': { canPreview: true, previewType: 'video' as const, maxSize: 100 * 1024 * 1024 },
  'video/avi': { canPreview: true, previewType: 'video' as const, maxSize: 100 * 1024 * 1024 },
  'video/mov': { canPreview: true, previewType: 'video' as const, maxSize: 100 * 1024 * 1024 },
  'video/wmv': { canPreview: true, previewType: 'video' as const, maxSize: 100 * 1024 * 1024 },
  'video/flv': { canPreview: true, previewType: 'video' as const, maxSize: 100 * 1024 * 1024 },
  
  // Audio files (limited preview support)
  'audio/mpeg': { canPreview: true, previewType: 'audio' as const, maxSize: 50 * 1024 * 1024 },
  'audio/mp3': { canPreview: true, previewType: 'audio' as const, maxSize: 50 * 1024 * 1024 },
  'audio/wav': { canPreview: true, previewType: 'audio' as const, maxSize: 50 * 1024 * 1024 },
  'audio/ogg': { canPreview: true, previewType: 'audio' as const, maxSize: 50 * 1024 * 1024 },
  'audio/aac': { canPreview: true, previewType: 'audio' as const, maxSize: 50 * 1024 * 1024 },
  'audio/flac': { canPreview: true, previewType: 'audio' as const, maxSize: 50 * 1024 * 1024 },
  'audio/webm': { canPreview: true, previewType: 'audio' as const, maxSize: 50 * 1024 * 1024 },
  
  // Office documents (limited preview - would need conversion)
  'application/msword': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
  'application/vnd.ms-excel': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
  'application/vnd.ms-powerpoint': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
  
  // Archives (no preview)
  'application/zip': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
  'application/x-rar': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
  'application/x-7z-compressed': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
  'application/x-tar': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
  'application/x-gzip': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
  
  // Executables (no preview for security)
  'application/x-executable': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
  'application/x-msdownload': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
  'application/x-apple-diskimage': { canPreview: false, previewType: 'none' as const, maxSize: undefined },
}

// Extension to MIME type mapping for common file types
export const EXTENSION_MIME_MAP: Record<string, string> = {
  // Images
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'bmp': 'image/bmp',
  'tiff': 'image/tiff',
  'tif': 'image/tiff',
  
  // Documents
  'pdf': 'application/pdf',
  'txt': 'text/plain',
  'html': 'text/html',
  'htm': 'text/html',
  'css': 'text/css',
  'js': 'text/javascript',
  'ts': 'application/typescript',
  'jsx': 'text/javascript',
  'tsx': 'application/typescript',
  'xml': 'text/xml',
  'csv': 'text/csv',
  'md': 'text/markdown',
  'markdown': 'text/markdown',
  'yaml': 'text/yaml',
  'yml': 'text/yaml',
  'json': 'application/json',
  
  // Code files
  'py': 'application/x-python',
  'java': 'application/x-java',
  'cpp': 'application/x-c++',
  'cc': 'application/x-c++',
  'cxx': 'application/x-c++',
  'c': 'application/x-c',
  'php': 'application/x-php',
  'rb': 'application/x-ruby',
  'go': 'application/x-go',
  'rs': 'application/x-rust',
  'swift': 'application/x-swift',
  'kt': 'application/x-kotlin',
  'scala': 'application/x-scala',
  'clj': 'application/x-clojure',
  'hs': 'application/x-haskell',
  'lua': 'application/x-lua',
  'pl': 'application/x-perl',
  'sh': 'application/x-shellscript',
  'bat': 'application/x-bat',
  'ps1': 'application/x-powershell',
  
  // Video
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'ogg': 'video/ogg',
  'avi': 'video/avi',
  'mov': 'video/mov',
  'wmv': 'video/wmv',
  'flv': 'video/flv',
  
  // Audio
  'mp3': 'audio/mp3',
  'wav': 'audio/wav',
  'aac': 'audio/aac',
  'flac': 'audio/flac',
  
  // Archives
  'zip': 'application/zip',
  'rar': 'application/x-rar',
  '7z': 'application/x-7z-compressed',
  'tar': 'application/x-tar',
  'gz': 'application/x-gzip',
  
  // Executables
  'exe': 'application/x-msdownload',
  'dmg': 'application/x-apple-diskimage',
  'deb': 'application/x-executable',
  'rpm': 'application/x-executable',
}

export function getFilePreviewInfo(filename: string, mimeType?: string): FilePreviewInfo {
  const extension = filename.split('.').pop()?.toLowerCase() || ''
  
  const resolvedMimeType = mimeType || EXTENSION_MIME_MAP[extension] || 'application/octet-stream'
  
  const previewInfo = PREVIEWABLE_TYPES[resolvedMimeType as keyof typeof PREVIEWABLE_TYPES]
  
  if (previewInfo) {
    return {
      canPreview: previewInfo.canPreview,
      previewType: previewInfo.previewType,
      mimeType: resolvedMimeType,
      extension,
      maxSize: previewInfo.maxSize
    }
  }
  
  return {
    canPreview: false,
    previewType: 'none',
    mimeType: resolvedMimeType,
    extension
  }
}

export function canPreviewFile(filename: string, mimeType: string, fileSize: number): boolean {
  const previewInfo = getFilePreviewInfo(filename, mimeType)
  
  if (!previewInfo.canPreview) {
    return false
  }
  
  if (previewInfo.maxSize && fileSize > previewInfo.maxSize) {
    return false
  }
  
  return true
}

export function generatePreviewUrl(
  emailId: string, 
  attachmentName: string, 
  fingerprint: string,
  previewType: string
): string {
  const params = new URLSearchParams({
    emailId,
    attachmentName,
    fingerprint,
    preview: previewType
  })
  
  return `/api/v1/attachments/preview?${params.toString()}`
}

export function getFileTypeInfo(filename: string, mimeType?: string): {
  icon: string
  color: string
  label: string
} {
  const extension = filename.split('.').pop()?.toLowerCase() || ''
  const resolvedMimeType = mimeType || EXTENSION_MIME_MAP[extension] || 'application/octet-stream'
  
  // Image files
  if (resolvedMimeType.startsWith('image/')) {
    return { icon: 'Image', color: 'text-blue-500', label: 'Image' }
  }
  
  // Video files
  if (resolvedMimeType.startsWith('video/')) {
    return { icon: 'FileVideo', color: 'text-purple-500', label: 'Video' }
  }
  
  // Audio files
  if (resolvedMimeType.startsWith('audio/')) {
    return { icon: 'FileAudio', color: 'text-yellow-500', label: 'Audio' }
  }
  
  // PDF files
  if (resolvedMimeType === 'application/pdf') {
    return { icon: 'FileText', color: 'text-red-500', label: 'PDF' }
  }
  
  // Text files
  if (resolvedMimeType.startsWith('text/')) {
    return { icon: 'FileText', color: 'text-green-500', label: 'Text' }
  }
  
  // Code files
  if (resolvedMimeType.startsWith('application/x-') || resolvedMimeType === 'application/json') {
    return { icon: 'FileCode', color: 'text-indigo-500', label: 'Code' }
  }
  
  // Archives
  if (resolvedMimeType.includes('zip') || resolvedMimeType.includes('rar') || 
      resolvedMimeType.includes('tar') || resolvedMimeType.includes('7z')) {
    return { icon: 'FileArchive', color: 'text-orange-500', label: 'Archive' }
  }
  
  // Office documents
  if (resolvedMimeType.includes('word') || resolvedMimeType.includes('excel') || 
      resolvedMimeType.includes('powerpoint') || resolvedMimeType.includes('document')) {
    return { icon: 'FileSpreadsheet', color: 'text-gray-500', label: 'Document' }
  }
  
  // Default
  return { icon: 'FileQuestion', color: 'text-gray-400', label: 'File' }
}
