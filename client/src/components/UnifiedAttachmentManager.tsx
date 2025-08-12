import { useState, useRef, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, 
  Image as ImageIcon, 
  File, 
  Eye, 
  Download, 
  X, 
  Upload,
  FileText,
  Video,
  Music,
  Archive,
  FileCode,
  Plus
} from 'lucide-react';

interface FileItem {
  url: string;
  name: string;
  size?: number;
}

interface Attachment {
  url: string;
  name: string;
  type: 'image' | 'file';
  size?: number;
  mimeType?: string;
}

interface PreviewFile {
  url: string;
  name: string;
  type: 'image' | 'pdf' | 'other';
}

interface UnifiedAttachmentManagerProps {
  imageUrls?: string[];
  fileUrls?: FileItem[];
  onImagesChange: (urls: string[]) => void;
  onFilesChange: (files: FileItem[]) => void;
  uploadEndpoint: string;
  maxFiles?: number;
  maxFileSize?: number;
}

const getFileIcon = (fileName: string, mimeType?: string) => {
  if (!fileName && !mimeType) return <File className="h-4 w-4" />;
  
  const extension = fileName?.split('.').pop()?.toLowerCase();
  const type = mimeType?.toLowerCase();
  
  if (type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) {
    return <ImageIcon className="h-4 w-4 text-green-600" />;
  }
  if (type?.includes('pdf') || extension === 'pdf') {
    return <FileText className="h-4 w-4 text-red-600" />;
  }
  if (type?.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv'].includes(extension || '')) {
    return <Video className="h-4 w-4 text-purple-600" />;
  }
  if (type?.startsWith('audio/') || ['mp3', 'wav', 'ogg'].includes(extension || '')) {
    return <Music className="h-4 w-4 text-blue-600" />;
  }
  if (['zip', 'rar', '7z'].includes(extension || '')) {
    return <Archive className="h-4 w-4 text-orange-600" />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml'].includes(extension || '')) {
    return <FileCode className="h-4 w-4 text-indigo-600" />;
  }
  
  return <File className="h-4 w-4 text-gray-600" />;
};

const extractFileName = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.split('/').pop() || 'unknown';
    return decodeURIComponent(fileName);
  } catch {
    return url.split('/').pop() || 'unknown';
  }
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const canPreview = (attachment: Attachment): boolean => {
  if (attachment.type === 'image') return true;
  const fileName = attachment.name.toLowerCase();
  return fileName.endsWith('.pdf');
};

export function UnifiedAttachmentManager({
  imageUrls = [],
  fileUrls = [],
  onImagesChange,
  onFilesChange,
  uploadEndpoint,
  maxFiles = 10,
  maxFileSize = 10485760 // 10MB
}: UnifiedAttachmentManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 모든 첨부파일을 통합하여 표시
  const allAttachments: Attachment[] = [
    ...(imageUrls?.map(url => ({
      url,
      name: extractFileName(url),
      type: 'image' as const,
      mimeType: 'image/jpeg'
    })) || []),
    ...(fileUrls?.map(file => ({
      ...file,
      type: 'file' as const
    })) || [])
  ];

  const handleFileUpload = async (files: File[], uploadType: 'auto' | 'image' | 'file' = 'auto') => {
    if (files.length === 0) return;

    // 파일 수 제한 체크
    const totalFiles = allAttachments.length + files.length;
    if (totalFiles > maxFiles) {
      toast({
        title: "파일 수 초과",
        description: `최대 ${maxFiles}개까지 업로드할 수 있습니다.`,
        variant: "destructive"
      });
      return;
    }

    // 파일 크기 체크
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: "파일 크기 초과",
        description: `${formatFileSize(maxFileSize)} 이하의 파일만 업로드할 수 있습니다.`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // 파일 타입에 따라 분류
      let images: File[] = [];
      let documents: File[] = [];

      if (uploadType === 'image') {
        images = files;
      } else if (uploadType === 'file') {
        documents = files;
      } else {
        // 자동 분류
        files.forEach(file => {
          if (file.type.startsWith('image/')) {
            images.push(file);
          } else {
            documents.push(file);
          }
        });
      }

      // 이미지 업로드
      if (images.length > 0) {
        const uploadPromises = images.map(async (file) => {
          // Get upload URL from backend
          const uploadResponse = await fetch(uploadEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!uploadResponse.ok) {
            throw new Error('업로드 URL 요청에 실패했습니다.');
          }

          const { uploadURL } = await uploadResponse.json();

          // Upload file to object storage
          const uploadFileResponse = await fetch(uploadURL, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
          });

          if (!uploadFileResponse.ok) {
            throw new Error('이미지 업로드 실패');
          }

          // Set ACL policy for uploaded file
          const aclResponse = await fetch('/api/files/set-acl', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileUrl: uploadURL
            }),
          });

          if (!aclResponse.ok) {
            throw new Error('ACL 설정 실패');
          }

          const aclResult = await aclResponse.json();
          return aclResult.objectPath;
        });

        const uploadedImageUrls = await Promise.all(uploadPromises);
        onImagesChange([...imageUrls, ...uploadedImageUrls]);
      }

      // 파일 업로드
      if (documents.length > 0) {
        const uploadPromises = documents.map(async (file) => {
          // Get upload URL from backend
          const uploadResponse = await fetch(uploadEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!uploadResponse.ok) {
            throw new Error('업로드 URL 요청에 실패했습니다.');
          }

          const { uploadURL } = await uploadResponse.json();

          // Upload file to object storage
          const uploadFileResponse = await fetch(uploadURL, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
          });

          if (!uploadFileResponse.ok) {
            throw new Error('파일 업로드 실패');
          }

          // Set ACL policy for uploaded file
          const aclResponse = await fetch('/api/files/set-acl', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileUrl: uploadURL
            }),
          });

          if (!aclResponse.ok) {
            throw new Error('ACL 설정 실패');
          }

          const aclResult = await aclResponse.json();
          return {
            url: aclResult.objectPath,
            name: file.name,
            size: file.size
          };
        });

        const uploadedFiles = await Promise.all(uploadPromises);
        onFilesChange([...fileUrls, ...uploadedFiles]);
      }

      toast({
        title: "업로드 완료",
        description: `${files.length}개 파일이 성공적으로 업로드되었습니다.`
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "업로드 실패",
        description: "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, uploadType: 'image' | 'file') => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files, uploadType);
    }
    e.target.value = '';
  };

  const handleRemove = (attachment: Attachment) => {
    if (attachment.type === 'image') {
      const newImageUrls = imageUrls.filter(url => url !== attachment.url);
      onImagesChange(newImageUrls);
    } else {
      const newFileUrls = fileUrls.filter(file => file.url !== attachment.url);
      onFilesChange(newFileUrls);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const response = await fetch(attachment.url);
      if (!response.ok) throw new Error('파일 다운로드에 실패했습니다.');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      window.open(attachment.url, '_blank');
    }
  };

  const handlePreview = (attachment: Attachment) => {
    if (attachment.type === 'image') {
      setPreviewFile({ url: attachment.url, name: attachment.name, type: 'image' });
    } else if (attachment.name.toLowerCase().endsWith('.pdf')) {
      setPreviewFile({ url: attachment.url, name: attachment.name, type: 'pdf' });
    }
  };

  return (
    <div className="space-y-2">
      {/* 업로드 영역 */}
      <div
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.preventDefault()}
      >
        <div className="space-y-1">
          <div className="flex justify-center">
            <Upload className="h-4 w-4 text-gray-400" />
          </div>
          
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              파일을 여기에 드래그하거나 아래 버튼을 클릭하세요
            </p>
            
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center space-x-1"
              >
                <Camera className="h-4 w-4" />
                <span>사진</span>
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center space-x-1"
              >
                <File className="h-4 w-4" />
                <span>파일</span>
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            최대 {maxFiles}개, 개당 {formatFileSize(maxFileSize)} 이하
          </p>
        </div>
      </div>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e, 'image')}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => handleFileSelect(e, 'file')}
        className="hidden"
      />

      {/* 미리보기 모달 */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="truncate pr-4">{previewFile.name}</span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload({ 
                      url: previewFile.url, 
                      name: previewFile.name, 
                      type: previewFile.type === 'image' ? 'image' : 'file' 
                    })}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    다운로드
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="mt-4">
              {previewFile.type === 'image' ? (
                <div className="flex justify-center">
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-w-full max-h-[70vh] object-contain rounded"
                  />
                </div>
              ) : previewFile.type === 'pdf' ? (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <FileText className="h-16 w-16 text-red-600" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">{previewFile.name}</p>
                    <p className="text-sm text-gray-500">PDF 문서</p>
                  </div>
                  <div className="flex justify-center space-x-3">
                    <Button
                      onClick={() => window.open(previewFile.url, '_blank')}
                      className="flex items-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>브라우저에서 열기</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">미리보기를 지원하지 않는 파일 형식입니다.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 업로드 중 표시 */}
      {isUploading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">업로드 중...</span>
          </div>
        </div>
      )}

      {/* 첨부파일 목록 */}
      {allAttachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 text-left">
            첨부파일 ({allAttachments.length}개)
          </h4>
          
          <div className="space-y-2">
            {allAttachments.map((attachment, index) => (
              <div
                key={`${attachment.type}-${attachment.url}-${index}`}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border space-y-2"
              >
                {/* 첫 번째 줄: 아이콘과 파일 정보 */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {attachment.type === 'image' ? (
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      getFileIcon(attachment.name, attachment.mimeType)
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words leading-tight">
                      {attachment.name}
                    </p>
                    {attachment.size && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(attachment.size)}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* 두 번째 줄: 액션 버튼들 */}
                <div className="flex items-center justify-end space-x-2 pt-1">
                  {canPreview(attachment) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreview(attachment)}
                      className="h-7 px-3 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      미리보기
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(attachment)}
                    className="h-7 px-3 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    다운로드
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemove(attachment)}
                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}