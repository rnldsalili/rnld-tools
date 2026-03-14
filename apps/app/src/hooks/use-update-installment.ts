import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';

type UpdateInstallmentBody = InferRequestType<
  typeof apiClient.loans[':loanId']['installments'][':installmentId']['$put']
>['json'];

interface UpdateInstallmentParams {
  loanId: string;
  installmentId: string;
  body: UpdateInstallmentBody;
}

export function useUpdateInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loanId, installmentId, body }: UpdateInstallmentParams) => {
      const res = await apiClient.loans[':loanId'].installments[':installmentId'].$put({
        param: { loanId, installmentId },
        json: body,
      });
      return res.json();
    },
    onSuccess: (_data, { loanId }) => {
      queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
    },
  });
}
