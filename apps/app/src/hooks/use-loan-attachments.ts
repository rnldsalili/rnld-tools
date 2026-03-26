import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';
import { downloadBlobFile, getFileTransferErrorMessage, readBlobResponseOrThrow } from '@/app/lib/file-transfer';
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
      try {
        const attachmentBlob = await fetchLoanAttachmentBlob({ loanId, attachmentId });
        downloadBlobFile(attachmentBlob, fileName);
      } catch (error) {
        throw new Error(getFileTransferErrorMessage(error, 'Failed to download loan attachment.'));
      }
    },
  });
}

export async function fetchLoanAttachmentBlob({
  loanId,
  attachmentId,
}: {
  loanId: string;
  attachmentId: string;
}) {
  const response = await apiClient.loans[':loanId'].attachments[':attachmentId'].download.$get({
    param: { loanId, attachmentId },
  });

  return readBlobResponseOrThrow(response, 'Failed to load loan attachment.');
}
