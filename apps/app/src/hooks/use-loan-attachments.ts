import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDetailedErrorMessage } from '@workspace/api-client';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient, { parseResponse } from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';
import { LOAN_LOGS_QUERY_KEY } from '@/app/hooks/use-loan';

const LOAN_ATTACHMENTS_QUERY_KEY = 'loan-attachments';

type LoanAttachmentsGetRoute = (typeof apiClient.loans)[':loanId']['attachments']['$get'];
type CreateLoanAttachmentRoute = (typeof apiClient.loans)[':loanId']['attachments']['$post'];

export type LoanAttachmentsResponse = InferResponseType<LoanAttachmentsGetRoute, 200>;
export type LoanAttachment = LoanAttachmentsResponse['data']['attachments'][number];
type CreateLoanAttachmentForm = InferRequestType<CreateLoanAttachmentRoute>['form'];

export function loanAttachmentsQueryOptions(loanId: string) {
  return queryOptions({
    queryKey: [LOAN_ATTACHMENTS_QUERY_KEY, loanId],
    queryFn: async () => {
      const response = await apiClient.loans[':loanId'].attachments.$get({
        param: { loanId },
      });

      return parseOkResponseOrThrow(response, 'Failed to load loan attachments.');
    },
    enabled: !!loanId,
  });
}

export function useLoanAttachments(loanId: string) {
  return useQuery(loanAttachmentsQueryOptions(loanId));
}

export function useCreateLoanAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      loanId,
      form,
    }: {
      loanId: string;
      form: CreateLoanAttachmentForm;
    }) => {
      const response = await apiClient.loans[':loanId'].attachments.$post({
        param: { loanId },
        form,
      });

      return parseOkResponseOrThrow(response, 'Failed to upload loan attachment.');
    },
    onSuccess: (_data, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: [LOAN_ATTACHMENTS_QUERY_KEY, loanId] });
      queryClient.invalidateQueries({ queryKey: [LOAN_LOGS_QUERY_KEY, loanId] });
    },
  });
}

export function useDeleteLoanAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      loanId,
      attachmentId,
    }: {
      loanId: string;
      attachmentId: string;
    }) => {
      const response = await apiClient.loans[':loanId'].attachments[':attachmentId'].$delete({
        param: { loanId, attachmentId },
      });

      return parseOkResponseOrThrow(response, 'Failed to delete loan attachment.');
    },
    onSuccess: (_data, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: [LOAN_ATTACHMENTS_QUERY_KEY, loanId] });
      queryClient.invalidateQueries({ queryKey: [LOAN_LOGS_QUERY_KEY, loanId] });
    },
  });
}

export function useDownloadLoanAttachment() {
  return useMutation({
    mutationFn: async ({
      loanId,
      attachmentId,
      fileName,
    }: {
      loanId: string;
      attachmentId: string;
      fileName: string;
    }) => {
      const fallbackMessage = 'Failed to download loan attachment.';

      try {
        const response = await apiClient.loans[':loanId'].attachments[':attachmentId'].download.$get({
          param: { loanId, attachmentId },
        });

        if (!response.ok) {
          await parseResponse(response);
          throw new Error(fallbackMessage);
        }

        const attachmentBlob = await response.blob();
        const objectUrl = URL.createObjectURL(attachmentBlob);
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
