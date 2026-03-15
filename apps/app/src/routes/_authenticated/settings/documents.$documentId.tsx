import { Link, createFileRoute } from '@tanstack/react-router';
import { ArrowLeftIcon, FileTextIcon, Loader2Icon, SaveIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui';
import { DocumentTemplateEditorForm } from '@/app/components/settings/document-template-editor-form';
import {
  useDocumentTemplate,
  useUpdateDocumentTemplate,
} from '@/app/hooks/use-document-templates';

const EDIT_DOCUMENT_TEMPLATE_FORM_ID = 'edit-document-template-form';

export const Route = createFileRoute('/_authenticated/settings/documents/$documentId')({
  head: () => ({ meta: [{ title: 'RTools - Edit Document Template' }] }),
  staticData: { title: 'Edit Document Template' },
  component: DocumentTemplateDetailPage,
});

function DocumentTemplateDetailPage() {
  const { documentId } = Route.useParams();
  const { data, isLoading, isError } = useDocumentTemplate(documentId);
  const { mutateAsync: updateTemplate, isPending } = useUpdateDocumentTemplate();

  const template = data?.data.document ?? null;

  async function handleSaveTemplate(values: {
    type: Parameters<typeof updateTemplate>[0]['type'];
    name: string;
    description?: string;
    linkExpiryDays: number;
    requiresSignature: boolean;
    content: Record<string, unknown>;
  }) {
    try {
      await updateTemplate({
        id: documentId,
        ...values,
      });
      toast.success('Template saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save template.');
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileTextIcon className="size-4" />
            </span>
            <div>
              <h1 className="text-lg font-semibold">
                {template ? template.name : 'Edit Document Template'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Update the template content and sharing requirements for this document.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/settings/documents">
                <ArrowLeftIcon className="size-3.5" />
                Back
              </Link>
            </Button>
            <Button
                type="submit"
                form={EDIT_DOCUMENT_TEMPLATE_FORM_ID}
                disabled={isPending || isLoading || !template}
                className="gap-2"
            >
              {isPending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <SaveIcon className="size-3.5" />
              )}
              Save
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex justify-center py-10">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : template ? (
          <DocumentTemplateEditorForm
              key={template.id}
              formId={EDIT_DOCUMENT_TEMPLATE_FORM_ID}
              template={template}
              onSubmit={handleSaveTemplate}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Template Not Found</CardTitle>
              <CardDescription>
                {isError
                  ? 'The document template could not be loaded.'
                  : 'This document template no longer exists.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" asChild>
                <Link to="/settings/documents">
                  <ArrowLeftIcon className="size-3.5" />
                  Back to Templates
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
