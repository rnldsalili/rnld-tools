import { useForm } from '@tanstack/react-form';
import { DocumentType } from '@workspace/constants';
import { InfoIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Field,
  FieldError,
  FieldLabel,
  Input,
  Label,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui';
import type { DocumentTemplate } from '@/app/hooks/use-document-templates';
import type { RichTextContent } from '@/app/lib/document-content';
import { AgreementEditor } from '@/app/components/settings/agreement-editor';
import { LOAN_DOCUMENT_PLACEHOLDERS } from '@/app/lib/document-placeholders';
import { toFieldErrors } from '@/app/lib/form';
import { isOneOf, toPlainRecord } from '@/app/lib/value-guards';

export const DOCUMENT_TYPE_OPTIONS = [
  { value: DocumentType.LOAN, label: 'Loan' },
] as const;

interface EditTemplateFormValues {
  type: DocumentType;
  name: string;
  description: string;
  linkExpiryDays: string;
  requiresSignature: boolean;
  content: RichTextContent;
}

interface DocumentTemplateEditorSubmitValues {
  type: DocumentType;
  name: string;
  description?: string;
  linkExpiryDays: number;
  requiresSignature: boolean;
  content: RichTextContent;
}

interface DocumentTemplateEditorFormProps {
  formId: string;
  template: DocumentTemplate;
  onSubmit: (values: DocumentTemplateEditorSubmitValues) => Promise<void>;
}

export function validateTemplateName(value: string) {
  return value.trim() ? undefined : 'Template name is required';
}

function validateLinkExpiryDays(value: string) {
  if (!value.trim()) {
    return 'Link expiry is required';
  }

  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 1 || parsedValue > 365) {
    return 'Link expiry must be between 1 and 365 days';
  }

  return undefined;
}

function getEditTemplateDefaultValues(template: DocumentTemplate): EditTemplateFormValues {
  return {
    type: template.type,
    name: template.name,
    description: template.description ?? '',
    linkExpiryDays: String(template.linkExpiryDays),
    requiresSignature: template.requiresSignature,
    content: toPlainRecord(template.content),
  };
}

export function DocumentTemplateEditorForm({
  formId,
  template,
  onSubmit,
}: DocumentTemplateEditorFormProps) {
  const form = useForm({
    defaultValues: getEditTemplateDefaultValues(template),
    onSubmit: async ({ value }) => {
      await onSubmit({
        type: value.type,
        name: value.name.trim(),
        description: value.description.trim() || undefined,
        content: value.content,
        linkExpiryDays: Number.parseInt(value.linkExpiryDays, 10),
        requiresSignature: value.requiresSignature,
      });
    },
  });

  return (
    <form
        id={formId}
        onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <SectionCard>
            <SectionCardHeader>
              <span className="text-sm font-semibold">General</span>
            </SectionCardHeader>
            <SectionCardContent>
              <div className="flex flex-col gap-4">
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
                          placeholder="Add context so admins know when to use this template."
                          rows={3}
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field
                    name="linkExpiryDays"
                    validators={{
                    onChange: ({ value }) => validateLinkExpiryDays(value),
                  }}
                >
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                      <div className="flex items-center gap-1.5">
                        <FieldLabel htmlFor={field.name}>
                          Link Expiry (days) <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoIcon className="size-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Shared document links will expire after this many days.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                          id={field.name}
                          type="number"
                          min={1}
                          max={365}
                          value={field.state.value}
                          onChange={(event) => field.handleChange(event.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full"
                      />
                      <FieldError errors={toFieldErrors(field.state.meta.errors)} />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="requiresSignature">
                  {(field) => (
                    <div className="flex items-center gap-3">
                      <Switch
                          id={field.name}
                          checked={field.state.value}
                          onCheckedChange={field.handleChange}
                      />
                      <Label htmlFor={field.name}>Requires client signature</Label>
                    </div>
                  )}
                </form.Field>
              </div>
            </SectionCardContent>
          </SectionCard>

          <SectionCard>
            <SectionCardHeader>
              <span className="text-sm font-semibold">Document Content</span>
            </SectionCardHeader>
            <SectionCardContent className="p-0">
              <form.Field name="content">
                {(field) => (
                  <AgreementEditor
                      content={field.state.value}
                      onChange={field.handleChange}
                  />
                )}
              </form.Field>
            </SectionCardContent>
          </SectionCard>
        </div>

        <div className="shrink-0 lg:w-56">
          <SectionCard>
            <SectionCardHeader>
              <span className="text-sm font-semibold">Placeholders</span>
            </SectionCardHeader>
            <SectionCardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                Click to copy. Paste anywhere in the content.
              </p>
              <div className="flex flex-col gap-1">
                {LOAN_DOCUMENT_PLACEHOLDERS.map((placeholder) => (
                  <button
                      key={placeholder.key}
                      type="button"
                      className="flex flex-col gap-0.5 rounded px-2 py-1.5 text-left transition-colors hover:bg-accent"
                      onClick={() => {
                      navigator.clipboard.writeText(placeholder.key);
                      toast.success(`Copied ${placeholder.key}`);
                    }}
                  >
                    <code className="text-xs font-mono text-primary">{placeholder.key}</code>
                    <span className="text-xs text-muted-foreground">{placeholder.label}</span>
                  </button>
                ))}
              </div>
            </SectionCardContent>
          </SectionCard>
        </div>
      </div>
    </form>
  );
}
