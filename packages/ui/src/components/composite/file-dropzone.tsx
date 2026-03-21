import * as React from 'react';
import { Loader2Icon, UploadIcon } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';

interface FileDropzoneProps {
  title: string;
  description: React.ReactNode;
  activeTitle?: string;
  browseLabel?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  isPending?: boolean;
  className?: string;
  onFilesSelected: (files: Array<File>) => void | Promise<void>;
}

function FileDropzone({
  title,
  description,
  activeTitle = 'Release to upload files',
  browseLabel = 'Browse Files',
  accept,
  multiple = true,
  disabled = false,
  isPending = false,
  className,
  onFilesSelected,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const dragDepthRef = React.useRef(0);
  const [isDragTargetActive, setIsDragTargetActive] = React.useState(false);

  function supportsFileDrop(event: React.DragEvent<HTMLDivElement>) {
    return event.dataTransfer.types.includes('Files');
  }

  async function handleFilesSelected(fileList: FileList | null) {
    const selectedFiles = Array.from(fileList ?? []);
    if (selectedFiles.length === 0 || disabled || isPending) {
      return;
    }

    await onFilesSelected(selectedFiles);
  }

  async function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    await handleFilesSelected(event.target.files);
    event.target.value = '';
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    if (disabled || isPending || !supportsFileDrop(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragTargetActive(true);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (disabled || isPending || !supportsFileDrop(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';

    if (!isDragTargetActive) {
      setIsDragTargetActive(true);
    }
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (disabled || isPending || !supportsFileDrop(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = Math.max(dragDepthRef.current - 1, 0);

    if (dragDepthRef.current === 0) {
      setIsDragTargetActive(false);
    }
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    if (disabled || isPending || !supportsFileDrop(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragTargetActive(false);
    await handleFilesSelected(event.dataTransfer.files);
  }

  return (
    <>
      <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(event) => void handleInputChange(event)}
      />
      <div
          className={cn(
          'rounded-xl border border-dashed px-4 py-5 transition-colors',
          isDragTargetActive
            ? 'border-primary bg-primary/5 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]'
            : 'border-border/80 bg-muted/30',
          disabled && 'cursor-not-allowed opacity-70',
          className,
        )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(event) => void handleDrop(event)}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
                className={cn(
                'rounded-lg p-2 transition-colors',
                isDragTargetActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground',
              )}
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <UploadIcon className="size-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {isDragTargetActive ? activeTitle : title}
              </p>
              <div className="mt-1 text-sm text-muted-foreground">
                {description}
              </div>
            </div>
          </div>
          <Button
              variant="outline"
              className="gap-1.5 self-start sm:self-center"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || isPending}
          >
            {isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <UploadIcon className="size-3.5" />
            )}
            {browseLabel}
          </Button>
        </div>
      </div>
    </>
  );
}

export { FileDropzone };
