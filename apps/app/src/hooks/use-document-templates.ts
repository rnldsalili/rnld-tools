import { DocumentType } from '@workspace/constants';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from '@workspace/api-client';
import apiClient from '@/app/lib/api';

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
      const res = await apiClient.documents.$get({
        query: { type: DocumentType.LOAN },
      });
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) {
        throw new Error(data.meta?.message ?? 'Failed to load document templates.');
      }
      return data as DocumentTemplatesResponse;
    },
  });
}

export function documentTemplateQueryOptions(id: string) {
  return queryOptions({
    queryKey: [DOC_TEMPLATES_QUERY_KEY, id],
    queryFn: async () => {
      const res = await apiClient.documents[':id'].$get({ param: { id } });
      if (res.status === 404) return null;
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) {
        throw new Error(data.meta?.message ?? 'Failed to load document template.');
      }
      return data as DocumentTemplateDetailResponse;
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
      const res = await apiClient.documents.$post({
        json: body,
      });
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) throw new Error(data.meta?.message ?? 'Failed to create template.');
      return data;
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
      const res = await apiClient.documents[':id'].$put({
        param: { id },
        json: { type, name, description, content, linkExpiryDays, requiresSignature },
      });
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) throw new Error(data.meta?.message ?? 'Failed to update template.');
      return data;
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
      const res = await apiClient.documents[':id'].$delete({ param: { id } });
      const data = await res.json() as { meta?: { message?: string } };
      if (!res.ok) throw new Error(data.meta?.message ?? 'Failed to delete template.');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOC_TEMPLATES_QUERY_KEY] });
    },
  });
}
