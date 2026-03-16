import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';

const DOCUMENT_LINKS_QUERY_KEY = 'document-links';

export type DocumentLinksResponse = InferResponseType<
  typeof apiClient.loans[':loanId']['document-links']['$get'],
  200
>;
export type DocumentLinkTemplateEntry = DocumentLinksResponse['data']['templates'][number];
export type DocumentToken = DocumentLinkTemplateEntry['tokens'][number];

export function documentLinksQueryOptions(loanId: string) {
  return queryOptions({
    queryKey: [DOCUMENT_LINKS_QUERY_KEY, loanId],
    queryFn: async () => {
      const res = await apiClient.loans[':loanId']['document-links'].$get({
        param: { loanId },
      });
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) {
        throw new Error(data.meta?.message ?? 'Failed to load document links.');
      }
      return data as DocumentLinksResponse;
    },
    enabled: !!loanId,
  });
}

export function useDocumentLinks(loanId: string) {
  return useQuery(documentLinksQueryOptions(loanId));
}

export function useCreateDocumentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loanId, templateId }: { loanId: string; templateId: string }) => {
      const res = await apiClient.loans[':loanId']['document-links'].$post({
        param: { loanId },
        json: { templateId },
      });
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) throw new Error(data.meta?.message ?? 'Failed to generate document link.');
      return data;
    },
    onSuccess: (_data, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_LINKS_QUERY_KEY, loanId] });
    },
  });
}

export function useDeleteDocumentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loanId, token }: { loanId: string; token: string }) => {
      const res = await apiClient.loans[':loanId']['document-links'][':token'].$delete({
        param: { loanId, token },
      });
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) throw new Error(data.meta?.message ?? 'Failed to revoke document link.');
      return data;
    },
    onSuccess: (_data, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_LINKS_QUERY_KEY, loanId] });
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
        const data = await response.json() as { meta?: { message?: string } };
        throw new Error(data.meta?.message ?? 'Failed to download document PDF.');
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
