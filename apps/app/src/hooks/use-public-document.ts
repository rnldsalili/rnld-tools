import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DetailedError, getDetailedErrorMessage } from '@workspace/api-client';
import type { InferRequestType, InferResponseType } from '@workspace/api-client';
import apiClient, { parseResponse } from '@/app/lib/api';

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

function toPublicDocumentRequestError(
  result: { meta: { message: string } },
  status: number,
  fallbackMessage: string,
) {
  return new PublicDocumentRequestError(result.meta.message || fallbackMessage, status);
}

export function publicDocumentQueryOptions(token: string) {
  return queryOptions({
    queryKey: [PUBLIC_DOCUMENT_QUERY_KEY, token],
    queryFn: async () => {
      const response = await apiClient.documents.public[':token'].$get({
        param: { token },
      });
      const result = await parseResponse(response);

      if (!response.ok) {
        throw toPublicDocumentRequestError(result, response.status, 'Failed to load document.');
      }

      return result;
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
      try {
        const response = await apiClient.documents.public[':token'].sign.$post({
          param: { token },
          json: body,
        });
        const result = await parseResponse(response);

        if (!response.ok) {
          throw toPublicDocumentRequestError(result, response.status, 'Failed to sign document.');
        }

        return result;
      } catch (error) {
        if (error instanceof PublicDocumentRequestError) {
          throw error;
        }

        throw new PublicDocumentRequestError(
          getDetailedErrorMessage(error) || 'Failed to sign document.',
          error instanceof DetailedError && typeof error.statusCode === 'number' ? error.statusCode : 500,
        );
      }
    },
    onSuccess: (_data, { token }) => {
      queryClient.invalidateQueries({ queryKey: [PUBLIC_DOCUMENT_QUERY_KEY, token] });
    },
  });
}
