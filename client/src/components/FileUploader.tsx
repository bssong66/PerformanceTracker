import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FileItem {
  url: string;
  name: string;
  size?: number;
  type?: string;
}

interface FileUploaderProps {
  files: FileItem[];
  onFilesChange: (files: FileItem[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  buttonClassName?: string;
  children: ReactNode;
  uploadEndpoint: string;
}

export function FileUploader({
  files = [],
  onFilesChange,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  acceptedTypes = ["*/*"],
  buttonClassName,
  children,
  uploadEndpoint,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return '🖼️';
    } else if (['pdf'].includes(extension)) {
      return '📄';
    } else if (['doc', 'docx'].includes(extension)) {
      return '📝';
    } else if (['xls', 'xlsx'].includes(extension)) {
      return '📊';
    } else if (['ppt', 'pptx'].includes(extension)) {
      return '📽️';
    } else if (['zip', 'rar', '7z'].includes(extension)) {
      return '🗜️';
    } else if (['txt', 'md'].includes(extension)) {
      return '📄';
    } else {
      return '📎';
    }
  };

  const isImageFile = (fileName: string): boolean => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    if (selectedFiles.length === 0) return;
    
    // Check file limits
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`);
      return;
    }

    // Check file sizes
    for (const file of selectedFiles) {
      if (file.size > maxFileSize) {
        alert(`파일 크기는 ${formatFileSize(maxFileSize)} 이하여야 합니다.`);
        return;
      }
    }

    setUploading(true);

    try {
      const uploadedFiles: FileItem[] = [];

      for (const file of selectedFiles) {
        // Get upload URL from server
        const response = await fetch(uploadEndpoint);
        const { uploadURL } = await response.json();

        // Upload file to object storage
        const uploadResponse = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`파일 업로드 실패: ${file.name}`);
        }

        // Create file item
        const fileItem: FileItem = {
          url: uploadURL.split('?')[0], // Remove query params
          name: file.name,
          size: file.size,
          type: file.type,
        };

        uploadedFiles.push(fileItem);
      }

      // Update files list
      onFilesChange([...files, ...uploadedFiles]);
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const handleFilePreview = (file: FileItem) => {
    setPreviewFile(file);
  };

  const handleFileDownload = (file: FileItem) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center space-x-2 ${buttonClassName}`}
            disabled={uploading || files.length >= maxFiles}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>업로드 중...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {children}
              </>
            )}
          </Button>
          <span className="text-sm text-gray-500">
            {files.length}/{maxFiles}개 파일
          </span>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-lg">{getFileIcon(file.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    {file.size && (
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {isImageFile(file.name) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFilePreview(file)}
                      className="h-8 w-8 p-0"
                      title="미리보기"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFileDownload(file)}
                    className="h-8 w-8 p-0"
                    title="다운로드"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFileRemove(index)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    title="삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={acceptedTypes.join(',')}
        multiple={maxFiles > 1}
        className="hidden"
      />

      {/* Image Preview Dialog */}
      {previewFile && isImageFile(previewFile.name) && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewFile.name}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}