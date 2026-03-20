import { Link, createFileRoute } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { DocumentType } from '@workspace/constants';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { Can, useCan } from '@workspace/permissions/react';
import { FileTextIcon, Loader2Icon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  DataTable,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@workspace/ui';
import type { ColumnDef } from '@tanstack/react-table';
import type { DocumentTemplateItem } from '@/app/hooks/use-document-templates';
import { ConfirmDeleteDialog } from '@/app/components/confirm-delete-dialog';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { AuthenticatedListPageShell } from '@/app/components/layout/authenticated-list-page-shell';
import {
  DOCUMENT_TYPE_OPTIONS,
  validateTemplateName,
} from '@/app/components/settings/document-template-editor-form';
import {
  useCreateDocumentTemplate,
  useDeleteDocumentTemplate,
  useDocumentTemplates,
} from '@/app/hooks/use-document-templates';
import { toFieldErrors } from '@/app/lib/form';
import { isOneOf } from '@/app/lib/value-guards';

export const Route = createFileRoute('/_authenticated/settings/(documents)/documents/')({
  head: () => ({ meta: [{ title: 'RTools - Document Templates' }] }),
  component: DocumentSettingsPage,
});

const NEW_TEMPLATE_FORM_ID = 'new-document-template-form';

interface NewTemplateFormValues {
  type: DocumentType;
  name: string;
  description: string;
}

const DEFAULT_NEW_TEMPLATE_VALUES: NewTemplateFormValues = {
  type: DocumentType.LOAN,
  name: '',
  description: '',
};

function NewTemplateModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutateAsync: createTemplate, isPending } = useCreateDocumentTemplate();
  const form = useForm({
    defaultValues: DEFAULT_NEW_TEMPLATE_VALUES,
    onSubmit: async ({ value }) => {
      try {
        await createTemplate({
          type: value.type,
          name: value.name.trim(),
          description: value.description.trim() || undefined,
        });
        toast.success('Template created.');
        form.reset();
        onOpenChange(false);
      } catch (error) {
        toast.error((error as Error).message);
      }
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
    }

    onOpenChange(nextOpen);
  }

  return (
    <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title="New Document Template"
        className="sm:max-w-lg"
        footer={(
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={NEW_TEMPLATE_FORM_ID} disabled={isPending} className="gap-2">
            {isPending && <Loader2Icon className="size-3.5 animate-spin" />}
            Create
          </Button>
        </div>
      )}
    >
      <form
          id={NEW_TEMPLATE_FORM_ID}
          onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
          className="flex flex-col gap-4"
      >
        <form.Field name="type">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                Document Type <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (isOneOf(DOCUMENT_TYPE_OPTIONS.map((option) => option.value), value)) {
                      field.handleChange(value);
                    }
                  }}
              >
                <SelectTrigger id={field.name} className="w-full">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Field
            name="name"
            validators={{
            onChange: ({ value }) => validateTemplateName(value),
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
              <FieldLabel htmlFor={field.name}>
                Template Name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="e.g. Repayment Agreement"
              />
              <FieldError errors={toFieldErrors(field.state.meta.errors)} />
            </Field>
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Description</FieldLabel>
              <Textarea
                  id={field.name}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Brief description of this document"
                  rows={3}
              />
            </Field>
          )}
        </form.Field>
      </form>
    </Modal>
  );
}

function DocumentSettingsPage() {
  const { data, isLoading } = useDocumentTemplates();
  const { mutateAsync: deleteTemplate, isPending: isDeletePending } = useDeleteDocumentTemplate();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [templatePendingDelete, setTemplatePendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const templates = data?.data.documents ?? [];
  const canViewDocuments = useCan(PermissionModule.DOCUMENTS, PermissionAction.VIEW);

  if (!canViewDocuments) {
    return (
      <UnauthorizedState
          title="Documents Restricted"
          description="You do not have permission to view document templates."
      />
    );
  }

  const normalizedSearch = searchInput.trim().toLowerCase();
  const filteredTemplates = normalizedSearch
    ? templates.filter((template: DocumentTemplateItem) => {
        const searchableText = [
          template.name,
          template.description ?? '',
          template.type,
        ].join(' ').toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
    : templates;

  async function handleDelete() {
    if (!templatePendingDelete) {
      return;
    }

    try {
      await deleteTemplate(templatePendingDelete.id);
      setTemplatePendingDelete(null);
      toast.success('Template deleted.');
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  const columns: Array<ColumnDef<(typeof templates)[number]>> = [
    {
      accessorKey: 'name',
      header: 'Template',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs">
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: 'linkExpiryDays',
      header: 'Link Expiry',
      cell: ({ row }) =>
        `${row.original.linkExpiryDays} day${row.original.linkExpiryDays === 1 ? '' : 's'}`,
    },
    {
      accessorKey: 'requiresSignature',
      header: 'Signature',
      cell: ({ row }) => (row.original.requiresSignature ? 'Required' : 'Optional'),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end text-sm">
          <Link
              to="/settings/documents/$documentId"
              params={{ documentId: row.original.id }}
              className="font-medium text-foreground transition-colors hover:text-primary"
          >
            Edit
          </Link>
          <Can I={PermissionAction.DELETE} a={PermissionModule.DOCUMENTS}>
            <>
              <span className="mx-2 h-4 w-px bg-border" aria-hidden="true" />
              <button
                  type="button"
                  className="font-medium text-destructive transition-colors hover:text-destructive/80"
                  onClick={() => setTemplatePendingDelete({ id: row.original.id, name: row.original.name })}
              >
                Delete
              </button>
            </>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <AuthenticatedListPageShell
        icon={FileTextIcon}
        title="Document Templates"
        description="Configure document templates that can be shared with clients."
        action={(
        <Can I={PermissionAction.CREATE} a={PermissionModule.DOCUMENTS}>
          <Button onClick={() => setIsNewOpen(true)} className="gap-2">
            <PlusIcon className="size-3.5" />
            New Template
          </Button>
        </Can>
      )}
        controls={(
        <Input
            placeholder="Search templates..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="max-w-sm bg-background"
        />
      )}
    >
      <DataTable columns={columns} data={filteredTemplates} isLoading={isLoading} variant="embedded" />
      <Can I={PermissionAction.CREATE} a={PermissionModule.DOCUMENTS}>
        <NewTemplateModal open={isNewOpen} onOpenChange={setIsNewOpen} />
      </Can>
      <Can I={PermissionAction.DELETE} a={PermissionModule.DOCUMENTS}>
        <ConfirmDeleteDialog
            open={templatePendingDelete !== null}
            onOpenChange={(open) => {
              if (!open && !isDeletePending) {
                setTemplatePendingDelete(null);
              }
            }}
            title="Delete Document Template"
            description={
              templatePendingDelete
                ? `Delete "${templatePendingDelete.name}"? This will permanently remove the template, its associated loan documents, and related document logs. Existing share links may remain in KV until they expire.`
                : 'This will permanently remove the template, its associated loan documents, and related document logs. Existing share links may remain in KV until they expire.'
            }
            confirmLabel="Delete Template"
            isPending={isDeletePending}
            onConfirm={handleDelete}
        />
      </Can>
    </AuthenticatedListPageShell>
  );
}
