import {
  DownloadIcon,
  FileSearchIcon,
  Loader2Icon,
} from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Modal } from '@workspace/ui/components/composite/modal';
import type * as React from 'react';

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fileName: string;
  contentType: string;
  previewUrl: string | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onDownload?: (() => void | Promise<void>) | undefined;
}

function FilePreviewModal({
  open,
  onOpenChange,
  title,
  fileName,
  contentType,
  previewUrl,
  isLoading = false,
  errorMessage,
  onDownload,
}: FilePreviewModalProps) {
  const previewType = getPreviewType(contentType);
  const canRenderPreview = Boolean(previewUrl && previewType);

  let previewContent: React.ReactNode;

  if (isLoading) {
    previewContent = (
      <PreviewState
          icon={<Loader2Icon className="size-8 animate-spin text-muted-foreground" />}
          title="Loading preview"
          description="Preparing the file for in-app viewing."
      />
    );
  } else if (errorMessage) {
    previewContent = (
      <PreviewState
          icon={<FileSearchIcon className="size-8 text-muted-foreground" />}
          title="Preview unavailable"
          description={errorMessage}
      />
    );
  } else if (!canRenderPreview) {
    previewContent = (
      <PreviewState
          icon={<FileSearchIcon className="size-8 text-muted-foreground" />}
          title="Preview not supported"
          description="This file type cannot be shown inline yet. Download the file to inspect it."
      />
    );
  } else if (previewType === 'image') {
    previewContent = (
      <div className="flex h-full min-h-0 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(244,244,245,0.92))] p-4 dark:bg-[radial-gradient(circle_at_top,rgba(39,39,42,0.96),rgba(9,9,11,0.96))] sm:p-6">
        <img
            src={previewUrl ?? undefined}
            alt={fileName}
            className="h-auto max-h-full w-auto max-w-full rounded-xl border border-border/70 bg-background object-contain shadow-lg"
        />
      </div>
    );
  } else {
    previewContent = (
      <div className="h-full min-h-0 bg-muted/10 p-3 sm:p-4">
        <iframe
            title={`${fileName} preview`}
            src={previewUrl ?? undefined}
            className="h-full min-h-[65vh] w-full rounded-xl border border-border/70 bg-background shadow-sm"
        />
      </div>
    );
  }

  return (
    <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={fileName}
        className="h-[88vh] max-h-[88vh] w-[calc(100vw-1.25rem)] max-w-[88vw] sm:w-[calc(100vw-2.5rem)] lg:max-w-[76rem]"
        contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden px-0 py-0"
        footer={(
          <div className="flex w-full items-center justify-end gap-2">
            {onDownload ? (
              <Button variant="outline" className="gap-1.5" onClick={() => void onDownload()}>
                <DownloadIcon className="size-4" />
                Download
              </Button>
            ) : null}
          </div>
        )}
    >
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {previewContent}
      </div>
    </Modal>
  );
}

function PreviewState({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex h-full min-h-[24rem] items-center justify-center bg-gradient-to-b from-muted/5 via-background to-muted/10 p-6">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-full border border-border/70 bg-background/90 shadow-sm">
          {icon}
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function getPreviewType(contentType: string) {
  const normalizedContentType = contentType.split(';')[0]?.trim().toLowerCase() ?? '';

  if (normalizedContentType.startsWith('image/')) {
    return 'image';
  }

  if (normalizedContentType === 'application/pdf') {
    return 'pdf';
  }

  return null;
}

export { FilePreviewModal, type FilePreviewModalProps };
