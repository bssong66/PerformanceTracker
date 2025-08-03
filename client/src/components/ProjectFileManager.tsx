import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Download, Trash2, File, FileText, Image, Eye } from 'lucide-react';
import { ObjectUploader } from '@/components/ObjectUploader';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { UploadResult } from '@uppy/core';

interface ProjectFile {
  id: number;
  projectId: number;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  objectPath: string;
  uploadedAt: string;
  userId: string;
}

interface ProjectFileManagerProps {
  projectId: number;
  projectTitle: string;
}

export function ProjectFileManager({ projectId, projectTitle }: ProjectFileManagerProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);

  // Fetch project files
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['project-files', projectId],
    queryFn: () => fetch(`/api/projects/${projectId}/files`).then(res => res.json())
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (fileData: {
      fileName: string;
      originalFileName: string;
      fileSize: number;
      mimeType: string;
      objectPath: string;
    }) => {
      return apiRequest('POST', `/api/projects/${projectId}/files`, fileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      toast({
        title: "파일 업로드 완료",
        description: "파일이 성공적으로 업로드되었습니다.",
      });
    },
    onError: (error) => {
      console.error('File upload error:', error);
      toast({
        title: "업로드 실패",
        description: "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return apiRequest('DELETE', `/api/projects/${projectId}/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      toast({
        title: "파일 삭제 완료",
        description: "파일이 성공적으로 삭제되었습니다.",
      });
      setShowDeleteDialog(false);
      setFileToDelete(null);
    },
    onError: (error) => {
      console.error('File delete error:', error);
      toast({
        title: "삭제 실패",
        description: "파일 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await fetch(`/api/projects/${projectId}/files/upload`, {
      method: 'POST',
    });
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const fileData = {
        fileName: uploadedFile.name || 'untitled',
        originalFileName: uploadedFile.name || 'untitled',
        fileSize: uploadedFile.size || 0,
        mimeType: uploadedFile.type || 'application/octet-stream',
        objectPath: uploadedFile.uploadURL || '',
      };
      uploadMutation.mutate(fileData);
    }
  };

  const handleDownload = (file: ProjectFile) => {
    const downloadUrl = `/api/projects/${projectId}/files/${file.id}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.originalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteFile = (file: ProjectFile) => {
    setFileToDelete(file);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (fileToDelete) {
      deleteMutation.mutate(fileToDelete.id);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (mimeType.includes('text') || mimeType.includes('document')) {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const handleView = (file: ProjectFile) => {
    if (file.mimeType.startsWith('image/')) {
      // Open image in a new tab for viewing
      const viewUrl = `/api/projects/${projectId}/files/${file.id}/download`;
      window.open(viewUrl, '_blank');
    } else {
      // For non-image files, just download
      handleDownload(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">프로젝트 파일</h3>
        <ObjectUploader
          maxNumberOfFiles={5}
          maxFileSize={50 * 1024 * 1024} // 50MB
          onGetUploadParameters={handleGetUploadParameters}
          onComplete={handleUploadComplete}
          buttonClassName="flex items-center gap-2"
        >
          <FileUp className="h-4 w-4" />
          파일 업로드
        </ObjectUploader>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">
          파일 목록을 불러오는 중...
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <File className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>업로드된 파일이 없습니다.</p>
          <p className="text-sm">위의 '파일 업로드' 버튼을 클릭하여 파일을 추가하세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file: ProjectFile) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(file.mimeType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={file.originalFileName}>
                    {file.originalFileName}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{formatFileSize(file.fileSize)}</span>
                    <span>
                      {format(new Date(file.uploadedAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleView(file)}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  보기
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(file)}
                  className="flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  다운로드
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteFile(file)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>파일 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              '{fileToDelete?.originalFileName}' 파일을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}