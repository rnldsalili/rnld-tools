import { DocumentType } from '@workspace/constants';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from '@workspace/api-client';
import apiClient, { parseResponse } from '@/app/lib/api';
import { parseOkResponseOrThrow } from '@/app/lib/api-response';

const DOC_TEMPLATES_QUERY_KEY = 'document-templates';

export type DocumentTemplatesResponse = InferResponseType<
  typeof apiClient.documents['$get'],
  200
>;
export type DocumentTemplateItem = DocumentTemplatesResponse['data']['documents'][number];

export type DocumentTemplateDetailResponse = InferResponseType<
  typeof apiClient.documents[':id']['$get'],
  200
>;
export type DocumentTemplate = DocumentTemplateDetailResponse['data']['document'];

export function documentTemplatesQueryOptions() {
  return queryOptions({
    queryKey: [DOC_TEMPLATES_QUERY_KEY],
    queryFn: async () => {
      const response = await apiClient.documents.$get({
        query: { type: DocumentType.LOAN },
      });
      return parseOkResponseOrThrow(response, 'Failed to load document templates.');
    },
  });
}

export function documentTemplateQueryOptions(id: string) {
  return queryOptions({
    queryKey: [DOC_TEMPLATES_QUERY_KEY, id],
    queryFn: async () => {
      const response = await apiClient.documents[':id'].$get({ param: { id } });
      const result = await parseResponse(response);

      if (response.status === 404) return null;

      if (!response.ok) {
        throw new Error(result.meta.message || 'Failed to load document template.');
      }

      return result;
    },
    enabled: !!id,
  });
}

export function useDocumentTemplates() {
  return useQuery(documentTemplatesQueryOptions());
}

export function useDocumentTemplate(id: string) {
  return useQuery(documentTemplateQueryOptions(id));
}

export function useCreateDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      type: DocumentType;
      name: string;
      description?: string;
      content?: Record<string, unknown>;
      linkExpiryDays?: number;
      requiresSignature?: boolean;
    }) => {
      const response = await apiClient.documents.$post({
        json: body,
      });
      return parseOkResponseOrThrow(response, 'Failed to create template.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOC_TEMPLATES_QUERY_KEY] });
    },
  });
}

export function useUpdateDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      type,
      name,
      description,
      content,
      linkExpiryDays,
      requiresSignature,
    }: {
      id: string;
      type: DocumentType;
      name: string;
      description?: string;
      content: Record<string, unknown>;
      linkExpiryDays: number;
      requiresSignature: boolean;
    }) => {
      const response = await apiClient.documents[':id'].$put({
        param: { id },
        json: { type, name, description, content, linkExpiryDays, requiresSignature },
      });
      return parseOkResponseOrThrow(response, 'Failed to update template.');
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [DOC_TEMPLATES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DOC_TEMPLATES_QUERY_KEY, id] });
    },
  });
}

export function useDeleteDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.documents[':id'].$delete({ param: { id } });
      return parseOkResponseOrThrow(response, 'Failed to delete template.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOC_TEMPLATES_QUERY_KEY] });
    },
  });
}
