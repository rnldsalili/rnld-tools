import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';

const PUBLIC_DOCUMENT_QUERY_KEY = 'public-document';

export class PublicDocumentRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PublicDocumentRequestError';
    this.status = status;
  }
}

export type PublicDocumentResponse = InferResponseType<
  typeof apiClient.documents.public[':token']['$get'],
  200
>;
export type PublicDocument = PublicDocumentResponse['data'];

type SignPublicDocumentBody = InferRequestType<
  typeof apiClient.documents.public[':token']['sign']['$post']
>['json'];

function toPublicDocumentRequestError(data: { meta?: { message?: string } }, status: number, fallback: string) {
  return new PublicDocumentRequestError(data.meta?.message ?? fallback, status);
}

export function publicDocumentQueryOptions(token: string) {
  return queryOptions({
    queryKey: [PUBLIC_DOCUMENT_QUERY_KEY, token],
    queryFn: async () => {
      const response = await apiClient.documents.public[':token'].$get({
        param: { token },
      });
      const data = await response.json() as { meta?: { message?: string } };

      if (!response.ok) {
        throw toPublicDocumentRequestError(data, response.status, 'Failed to load document.');
      }

      return data as PublicDocumentResponse;
    },
    enabled: !!token,
  });
}

export function usePublicDocument(token: string) {
  return useQuery(publicDocumentQueryOptions(token));
}

export function useSignPublicDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      body,
    }: {
      token: string;
      body: SignPublicDocumentBody;
    }) => {
      const response = await apiClient.documents.public[':token'].sign.$post({
        param: { token },
        json: body,
      });
      const data = await response.json() as { meta?: { message?: string } };

      if (!response.ok) {
        throw toPublicDocumentRequestError(data, response.status, 'Failed to sign document.');
      }

      return data;
    },
    onSuccess: (_data, { token }) => {
      queryClient.invalidateQueries({ queryKey: [PUBLIC_DOCUMENT_QUERY_KEY, token] });
    },
  });
}
