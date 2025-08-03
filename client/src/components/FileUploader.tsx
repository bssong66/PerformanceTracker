import { useState, useRef, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { X, Download, File, FileText, Image, Video, Music, Archive, FileCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileItem {
  url: string;
  name: string;
  size?: number;
}

interface FileUploaderProps {
  files: FileItem[];
  onFilesChange: (files: FileItem[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  uploadEndpoint: string;
  children: ReactNode;
}

const getFileIcon = (fileName: string) => {
  if (!fileName) return <File className="h-4 w-4" />;
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
      return <Image className="h-4 w-4" />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
      return <Video className="h-4 w-4" />;
    case 'mp3':
    case 'wav':
    case 'ogg':
      return <Music className="h-4 w-4" />;
    case 'zip':
    case 'rar':
    case '7z':
      return <Archive className="h-4 w-4" />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'json':
    case 'xml':
      return <FileCode className="h-4 w-4" />;
    case 'txt':
    case 'md':
    case 'doc':
    case 'docx':
    case 'pdf':
      return <FileText className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const truncateFileName = (fileName: string, maxLength: number = 40): string => {
  if (!fileName || fileName.length <= maxLength) return fileName;
  
  const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  
  if (extension) {
    const maxNameLength = maxLength - extension.length - 4; // 4 for "..." and "."
    if (maxNameLength <= 0) return `...${extension}`;
    return `${nameWithoutExt.substring(0, maxNameLength)}...${extension}`;
  } else {
    return `${fileName.substring(0, maxLength - 3)}...`;
  }
};

export function FileUploader({
  files,
  onFilesChange,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ["*/*"],
  uploadEndpoint,
  children
}: FileUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    if (files.length + selectedFiles.length > maxFiles) {
      toast({
        title: "파일 개수 초과",
        description: `최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`,
        variant: "destructive"
      });
      return;
    }

    for (const file of selectedFiles) {
      if (file.size > maxFileSize) {
        toast({
          title: "파일 크기 초과",
          description: `${file.name}의 크기가 ${formatFileSize(maxFileSize)}를 초과합니다.`,
          variant: "destructive"
        });
        continue;
      }

      await uploadFile(file);
    }

    // Clear the input
    event.target.value = '';
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);

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
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
        }
      });

      xhr.onload = async () => {
        if (xhr.status === 200) {
          try {
            // Set ACL policy for uploaded file
            const aclResponse = await fetch('/api/files/set-acl', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fileUrl: uploadURL
              })
            });

            if (!aclResponse.ok) {
              throw new Error('ACL 설정에 실패했습니다.');
            }

            const { objectPath } = await aclResponse.json();
            
            const newFile: FileItem = {
              url: objectPath,
              name: file.name,
              size: file.size
            };

            onFilesChange([...files, newFile]);
            
            toast({
              title: "업로드 완료",
              description: `${file.name}이 성공적으로 업로드되었습니다.`
            });
          } catch (error) {
            console.error('ACL setting error:', error);
            // Fallback to basic object path
            const url = new URL(uploadURL);
            const bucketPath = url.pathname;
            const objectPath = `/objects/${bucketPath.split('/').slice(2).join('/')}`;
            
            const newFile: FileItem = {
              url: objectPath,
              name: file.name,
              size: file.size
            };

            onFilesChange([...files, newFile]);
            
            toast({
              title: "업로드 완료",
              description: `${file.name}이 업로드되었지만 권한 설정에 문제가 있습니다.`,
              variant: "destructive"
            });
          }
        } else {
          throw new Error('파일 업로드에 실패했습니다.');
        }
        setUploading(false);
        setUploadProgress(0);
      };

      xhr.onerror = () => {
        toast({
          title: "업로드 실패",
          description: "파일 업로드 중 오류가 발생했습니다.",
          variant: "destructive"
        });
        setUploading(false);
        setUploadProgress(0);
      };

      xhr.open('PUT', uploadURL);
      xhr.send(file);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "파일 업로드에 실패했습니다.",
        variant: "destructive"
      });
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    onFilesChange(updatedFiles);
  };

  const downloadFile = (file: FileItem) => {
    window.open(file.url, '_blank');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleFileSelect}
          disabled={uploading || files.length >= maxFiles}
          className="flex items-center space-x-2"
        >
          {children}
        </Button>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {files.length}/{maxFiles}개 파일
        </span>
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">업로드 중...</div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex-shrink-0">
                {getFileIcon(file.name || '')}
              </div>
              <div className="flex-1 min-w-0">
                <div 
                  className="text-sm font-medium cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors text-gray-900 dark:text-gray-100" 
                  title={file.name || 'Unknown file'}
                  onClick={() => downloadFile(file)}
                >
                  {truncateFileName(file.name || 'Unknown file')}
                </div>
                {file.size && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatFileSize(file.size)}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadFile(file)}
                  className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  title="미리보기"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 dark:text-red-400 dark:hover:text-red-300"
                  title="삭제"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptedTypes.join(',')}
        multiple={maxFiles > 1}
        className="hidden"
      />
      
      <div className="text-xs text-gray-500 dark:text-gray-400">
        최대 파일 크기: {formatFileSize(maxFileSize)} | 지원 형식: 모든 파일
      </div>
    </div>
  );
}