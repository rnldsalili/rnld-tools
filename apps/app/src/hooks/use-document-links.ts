import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import type { InferResponseType } from '@workspace/api-client';
import apiClient, { parseResponse } from '@/app/lib/api';
import { isPlainRecord } from '@/app/lib/value-guards';

const DOCUMENT_LINKS_QUERY_KEY = 'document-links';

export type DocumentLinksResponse = InferResponseType<
  typeof apiClient.loans[':loanId']['document-links']['$get'],
  200
>;
export type CreateDocumentLinkResponse = InferResponseType<
  typeof apiClient.loans[':loanId']['document-links']['$post'],
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
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to load document links.');
      }

      return result;
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
      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to generate document link.');
      }

      return result;
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
      const response = await apiClient.loans[':loanId'].documents[':templateId'].pdf.$get({
        param: { loanId, templateId },
      });

      if (!response.ok) {
        const result = await parseResponse(response);
        const fallbackMessage = 'Failed to download document PDF.';
        const errorMessage = getResponseMetaMessage(result) || fallbackMessage;

        throw new Error(errorMessage);
      }

      const pdfBlob = await response.blob();
      const objectUrl = URL.createObjectURL(pdfBlob);
      const anchorElement = document.createElement('a');
      anchorElement.href = objectUrl;
      anchorElement.download = fileName;
      anchorElement.click();
      URL.revokeObjectURL(objectUrl);
    },
  });
}

function getResponseMetaMessage(result: unknown) {
  if (!isPlainRecord(result) || !isPlainRecord(result.meta)) {
    return undefined;
  }

  return typeof result.meta.message === 'string' ? result.meta.message : undefined;
}
