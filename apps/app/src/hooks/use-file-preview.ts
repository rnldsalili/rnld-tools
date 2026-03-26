import { useEffect, useRef, useState } from 'react';
import { getFileTransferErrorMessage } from '@/app/lib/file-transfer';

export type FilePreviewSourceKind = 'loan-attachment' | 'loan-document-pdf';

export type FilePreviewSource = {
  id: string;
  kind: FilePreviewSourceKind;
};

export type FilePreviewState = {
  contentType: string;
  errorMessage: string | null;
  fileName: string;
  isLoading: boolean;
  isOpen: boolean;
  previewUrl: string | null;
  source: FilePreviewSource | null;
};

type OpenFilePreviewOptions = {
  contentType: string;
  fileName: string;
  loadPreview: () => Promise<Blob>;
  source: FilePreviewSource;
};

const INITIAL_PREVIEW_STATE: FilePreviewState = {
  contentType: '',
  errorMessage: null,
  fileName: '',
  isLoading: false,
  isOpen: false,
  previewUrl: null,
  source: null,
};

export function useFilePreview() {
  const [previewState, setPreviewState] = useState<FilePreviewState>(INITIAL_PREVIEW_STATE);
  const activeObjectUrlRef = useRef<string | null>(null);
  const requestVersionRef = useRef(0);

  function revokeActiveObjectUrl() {
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
  }

  function closePreview() {
    requestVersionRef.current += 1;
    revokeActiveObjectUrl();
    setPreviewState(INITIAL_PREVIEW_STATE);
  }

  async function openPreview({
    contentType,
    fileName,
    loadPreview,
    source,
  }: OpenFilePreviewOptions) {
    requestVersionRef.current += 1;
    const requestVersion = requestVersionRef.current;

    revokeActiveObjectUrl();
    setPreviewState({
      contentType,
      errorMessage: null,
      fileName,
      isLoading: true,
      isOpen: true,
      previewUrl: null,
      source,
    });

    try {
      const previewBlob = await loadPreview();
      const previewUrl = URL.createObjectURL(previewBlob);

      if (requestVersion !== requestVersionRef.current) {
        URL.revokeObjectURL(previewUrl);
        return;
      }

      activeObjectUrlRef.current = previewUrl;
      setPreviewState((previousPreviewState) => ({
        ...previousPreviewState,
        errorMessage: null,
        isLoading: false,
        previewUrl,
      }));
    } catch (error) {
      if (requestVersion !== requestVersionRef.current) {
        return;
      }

      setPreviewState((previousPreviewState) => ({
        ...previousPreviewState,
        errorMessage: getFileTransferErrorMessage(error, 'Failed to load file preview.'),
        isLoading: false,
        previewUrl: null,
      }));
    }
  }

  useEffect(() => {
    return () => {
      requestVersionRef.current += 1;
      revokeActiveObjectUrl();
    };
  }, []);

  return {
    closePreview,
    openPreview,
    previewState,
    setPreviewOpen: (isOpen: boolean) => {
      if (!isOpen) {
        closePreview();
      }
    },
  };
}
