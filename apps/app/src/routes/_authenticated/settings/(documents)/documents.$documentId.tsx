import { Link, createFileRoute } from '@tanstack/react-router';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { Can, useCan } from '@workspace/permissions/react';
import { ArrowLeftIcon, FileTextIcon, Loader2Icon, SaveIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
} from '@workspace/ui';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { AuthenticatedDetailPageShell } from '@/app/components/layout/authenticated-detail-page-shell';
import { DocumentTemplateEditorForm } from '@/app/components/settings/document-template-editor-form';
import {
  useDocumentTemplate,
  useUpdateDocumentTemplate,
} from '@/app/hooks/use-document-templates';

const EDIT_DOCUMENT_TEMPLATE_FORM_ID = 'edit-document-template-form';

export const Route = createFileRoute('/_authenticated/settings/(documents)/documents/$documentId')({
  head: () => ({ meta: [{ title: 'RTools - Edit Document Template' }] }),
  staticData: { title: 'Edit Document Template' },
  component: DocumentTemplateDetailPage,
});

function DocumentTemplateDetailPage() {
  const { documentId } = Route.useParams();
  const { data, isLoading, isError } = useDocumentTemplate(documentId);
  const { mutateAsync: updateTemplate, isPending } = useUpdateDocumentTemplate();

  const template = data?.data.document ?? null;
  const canViewDocuments = useCan(PermissionModule.DOCUMENTS, PermissionAction.VIEW);
  const canUpdateDocuments = useCan(PermissionModule.DOCUMENTS, PermissionAction.UPDATE);

  if (!canViewDocuments) {
    return (
      <UnauthorizedState
          title="Document Access Restricted"
          description="You do not have permission to view this document template."
      />
    );
  }

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
      toast.error((error as Error).message);
    }
  }

  return (
    <AuthenticatedDetailPageShell
        icon={FileTextIcon}
        title={template ? template.name : 'Edit Document Template'}
        description="Update the template content and sharing requirements for this document."
        backAction={(
          <Button variant="ghost" asChild>
            <Link to="/settings/documents">
              <ArrowLeftIcon className="size-3.5" />
              Back
            </Link>
          </Button>
        )}
        action={(
          <Can I={PermissionAction.UPDATE} a={PermissionModule.DOCUMENTS}>
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
          </Can>
        )}
        meta={template ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {template.type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Link expires in {template.linkExpiryDays} day{template.linkExpiryDays === 1 ? '' : 's'}
            </Badge>
            <Badge variant={template.requiresSignature ? 'default' : 'outline'} className="text-xs">
              {template.requiresSignature ? 'Signature required' : 'Signature optional'}
            </Badge>
          </div>
        ) : null}
    >
      {isLoading ? (
        <SectionCard>
          <SectionCardContent className="flex justify-center py-10">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </SectionCardContent>
        </SectionCard>
      ) : template ? (
        <DocumentTemplateEditorForm
            key={template.id}
            formId={EDIT_DOCUMENT_TEMPLATE_FORM_ID}
            template={template}
            editable={canUpdateDocuments}
            onSubmit={handleSaveTemplate}
        />
      ) : (
        <SectionCard>
          <SectionCardHeader className="flex flex-col items-start gap-2">
            <div>
              <h2 className="text-base font-semibold">Template Not Found</h2>
              <p className="text-sm text-muted-foreground">
                {isError
                  ? 'The document template could not be loaded.'
                  : 'This document template no longer exists.'}
              </p>
            </div>
          </SectionCardHeader>
          <SectionCardContent>
            <Button variant="ghost" asChild>
              <Link to="/settings/documents">
                <ArrowLeftIcon className="size-3.5" />
                Back to Templates
              </Link>
            </Button>
          </SectionCardContent>
        </SectionCard>
      )}
    </AuthenticatedDetailPageShell>
  );
}
