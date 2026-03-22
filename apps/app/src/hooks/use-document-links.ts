import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { getDetailedErrorMessage } from '@workspace/api-client';
import type { InferResponseType } from '@workspace/api-client';
import apiClient, { parseResponse } from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';

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
      const fallbackMessage = 'Failed to download document PDF.';

      try {
        const response = await apiClient.loans[':loanId'].documents[':templateId'].pdf.$get({
          param: { loanId, templateId },
        });

        if (!response.ok) {
          await parseResponse(response);
          throw new Error(fallbackMessage);
        }

        const pdfBlob = await response.blob();
        const objectUrl = URL.createObjectURL(pdfBlob);
        const anchorElement = document.createElement('a');
        anchorElement.href = objectUrl;
        anchorElement.download = fileName;
        anchorElement.click();
        URL.revokeObjectURL(objectUrl);
      } catch (error) {
        throw new Error(getDetailedErrorMessage(error) || fallbackMessage);
      }
    },
  });
}
