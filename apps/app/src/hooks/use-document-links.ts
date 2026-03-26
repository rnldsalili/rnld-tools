import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import type { InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';
import { downloadBlobFile, getFileTransferErrorMessage, readBlobResponseOrThrow } from '@/app/lib/file-transfer';

const DOCUMENT_LINKS_QUERY_KEY = 'document-links';

export type DocumentLinksResponse = InferResponseType<
  typeof apiClient.loans[':loanId']['document-links']['$get'],
  200
>;
export type CreateDocumentLinkResponse = InferResponseType<
  typeof apiClient.loans[':loanId']['document-links']['$post'],
  201
>;
export type RequestDocumentSignatureResponse = InferResponseType<
  typeof apiClient.loans[':loanId']['document-links']['request-signature']['$post'],
  201
>;
export type DocumentLinkTemplateEntry = DocumentLinksResponse['data']['templates'][number];

export function documentLinksQueryOptions(loanId: string) {
  return queryOptions({
    queryKey: [DOCUMENT_LINKS_QUERY_KEY, loanId],
    queryFn: async () => {
      const response = await apiClient.loans[':loanId']['document-links'].$get({
        param: { loanId },
      });
      return parseOkResponseOrThrow(response, 'Failed to load document links.');
    },
    enabled: !!loanId,
  });
}

export function useDocumentLinks(loanId: string) {
  return useQuery(documentLinksQueryOptions(loanId));
}

export function useCreateDocumentLink() {
  return useMutation({
    mutationFn: async ({ loanId, templateId }: { loanId: string; templateId: string }) => {
      const response = await apiClient.loans[':loanId']['document-links'].$post({
        param: { loanId },
        json: { templateId },
      });
      return parseOkResponseOrThrow(response, 'Failed to generate document link.');
    },
  });
}

export function useRequestLoanDocumentSignature() {
  return useMutation({
    mutationFn: async ({ loanId, templateId }: { loanId: string; templateId: string }) => {
      const response = await apiClient.loans[':loanId']['document-links']['request-signature'].$post({
        param: { loanId },
        json: { templateId },
      });
      return parseOkResponseOrThrow(response, 'Failed to request document signature.');
    },
  });
}

export function useDownloadLoanDocumentPdf() {
  return useMutation({
    mutationFn: async ({
      fileName,
      loanId,
      templateId,
    }: {
      fileName: string;
      loanId: string;
      templateId: string;
    }) => {
      try {
        const pdfBlob = await fetchLoanDocumentPdfBlob({ loanId, templateId });
        downloadBlobFile(pdfBlob, fileName);
      } catch (error) {
        throw new Error(getFileTransferErrorMessage(error, 'Failed to download document PDF.'));
      }
    },
  });
}

export async function fetchLoanDocumentPdfBlob({
  loanId,
  templateId,
}: {
  loanId: string;
  templateId: string;
}) {
  const response = await apiClient.loans[':loanId'].documents[':templateId'].pdf.$get({
    param: { loanId, templateId },
  });

  return readBlobResponseOrThrow(response, 'Failed to load document PDF.');
}
