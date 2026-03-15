import { Link, createFileRoute } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { DocumentType } from '@workspace/constants';
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

export const Route = createFileRoute('/_authenticated/settings/documents/')({
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
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create template.');
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
                  onValueChange={(value) => field.handleChange(value as DocumentType)}
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
  const { mutateAsync: deleteTemplate } = useDeleteDocumentTemplate();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const templates = data?.data.documents ?? [];
  const normalizedSearch = searchInput.trim().toLowerCase();
  const filteredTemplates = normalizedSearch
    ? templates.filter((template) => {
        const searchableText = [
          template.name,
          template.description ?? '',
          template.type,
        ].join(' ').toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
    : templates;

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will also remove all associated documents and links.`)) {
      return;
    }

    try {
      await deleteTemplate(id);
      toast.success('Template deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template.');
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
          <span className="mx-2 h-4 w-px bg-border" aria-hidden="true" />
          <button
              type="button"
              className="font-medium text-destructive transition-colors hover:text-destructive/80"
              onClick={() => handleDelete(row.original.id, row.original.name)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileTextIcon className="size-4" />
            </span>
            <div>
              <h1 className="text-lg font-semibold">Document Templates</h1>
              <p className="text-sm text-muted-foreground">
                Configure document templates that can be shared with borrowers.
              </p>
            </div>
          </div>
          <Button onClick={() => setIsNewOpen(true)} className="gap-2">
            <PlusIcon className="size-3.5" />
            New Template
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Input
              placeholder="Search templates..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="max-w-xs"
          />
        </div>

        <DataTable columns={columns} data={filteredTemplates} isLoading={isLoading} />
      </div>

      <NewTemplateModal open={isNewOpen} onOpenChange={setIsNewOpen} />
    </div>
  );
}
