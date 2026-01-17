import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { uploadApi } from "@/lib/upload-api";
import { Upload, X, Image as ImageIcon, File, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  multiple?: boolean;
  acceptedFileTypes?: string;
  maxFileSize?: number; // in MB
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  multiple = false,
  acceptedFileTypes = ".jpg,.jpeg,.png,.gif,.webp",
  maxFileSize = 5,
  className,
  ...props
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
      // Logic for preview could go here if we wanted local preview before upload
    };
    reader.readAsDataURL(file);

    // Validate file size
    if (file.size > maxFileSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `File size must be less than ${maxFileSize}MB`,
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = acceptedFileTypes.replace(/\./g, '').split(',');
    
    if (fileExtension && !allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: `Please upload files with these extensions: ${acceptedFileTypes}`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await uploadApi.uploadFile(file);
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Set the uploaded file URL
      onChange(result.url || result.filename);
      
      toast({
        title: "Upload successful",
        description: "File has been uploaded successfully",
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [maxFileSize, acceptedFileTypes, onChange, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  }, [handleFileUpload]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files);
  };

  const removeFile = () => {
    onChange("");
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  return (
    <div className={className} {...props}>
      {value ? (
        <Card className="w-full">
          <CardContent className="p-4">
            <div className="relative">
              {isImage(value) ? (
                <div className="relative">
                  <img
                    src={value}
                    alt="Uploaded file"
                    className="w-full h-48 object-cover rounded-lg"
                    data-testid="uploaded-image"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeFile}
                    data-testid="button-remove-image"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <File className="w-8 h-8 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {value.split('/').pop() || 'Uploaded file'}
                    </p>
                    <p className="text-xs text-gray-500">File uploaded successfully</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    data-testid="button-remove-file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full">
          <CardContent className="p-6">
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-testid="upload-dropzone"
            >
              <input
                type="file"
                accept={acceptedFileTypes}
                onChange={handleFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
                data-testid="file-input"
              />
              
              {uploading ? (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 mx-auto text-blue-500 animate-bounce" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Uploading...
                    </p>
                    <Progress value={uploadProgress} className="mt-2" />
                    <p className="text-sm text-gray-500 mt-1">
                      {uploadProgress}% complete
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <ImageIcon className="w-12 h-12 mx-auto text-gray-400" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Drop files here or click to upload
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports: {acceptedFileTypes} (max {maxFileSize}MB)
                    </p>
                  </div>
                  <Button type="button" variant="outline" disabled={uploading}>
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            {!uploading && (
              <div className="mt-4 flex items-start space-x-2 text-xs text-gray-500">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p>
                    • Maximum file size: {maxFileSize}MB
                  </p>
                  <p>
                    • Supported formats: {acceptedFileTypes.replace(/\./g, '').toUpperCase()}
                  </p>
                  <p>
                    • Images will be automatically optimized
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}