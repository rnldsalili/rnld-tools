import { format } from 'date-fns';
import {
  FileTextIcon,
  Loader2Icon,
  PenSquareIcon,
  Share2Icon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Modal,
} from '@workspace/ui';

import type { DocumentLinkTemplateEntry } from '@/app/hooks/use-document-links';
import { useCreateDocumentLink, useDocumentLinks } from '@/app/hooks/use-document-links';

interface ShareDocumentDialogProps {
  loanId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getDocumentUrl(token: string) {
  return `${window.location.origin}/documents/${token}`;
}

function getDocumentShareMessage(templateName: string, url: string) {
  return `You are requested to sign ${templateName}.\n\n${url}`;
}

async function copyDocumentShareMessage(message: string) {
  try {
    await navigator.clipboard.writeText(message);
  } catch {
    throw new Error('Clipboard is not available.');
  }
}

async function shareDocumentUrl(url: string, templateName: string) {
  const shareMessage = getDocumentShareMessage(templateName, url);

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({
        text: shareMessage,
      });
      toast.success('Document link shared.');
      return;
    } catch {
      // Fall back to clipboard copy when sharing is unavailable or dismissed.
    }
  }

  await copyDocumentShareMessage(shareMessage);
  toast.success('Document link copied to clipboard.');
}

export function ShareDocumentDialog({ loanId, open, onOpenChange }: ShareDocumentDialogProps) {
  const { data, isLoading } = useDocumentLinks(loanId);
  const { mutateAsync: createLink, isPending: isGenerating, variables: generatingVars } = useCreateDocumentLink();
  const templateEntries: Array<DocumentLinkTemplateEntry> = data?.data.templates ?? [];

  async function handleGenerate(templateId: string, templateName: string) {
    try {
      const createdDocumentLink = await createLink({ loanId, templateId });
      await shareDocumentUrl(getDocumentUrl(createdDocumentLink.data.token.token), templateName);
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Share Documents"
        className="sm:max-w-lg"
    >
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : templateEntries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <FileTextIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No document templates configured. Go to Settings → Documents to create one.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {templateEntries.map(({ template, document }: DocumentLinkTemplateEntry) => {
            const isThisGenerating = isGenerating && generatingVars?.templateId === template.id; // eslint-disable-line @typescript-eslint/no-unnecessary-condition
            return (
              <div key={template.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="size-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{template.name}</span>
                    {document?.signedAt ? (
                      <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs gap-1">
                        <PenSquareIcon className="size-3" />
                        Signed
                      </Badge>
                    ) : template.requiresSignature ? (
                      <Badge variant="secondary" className="text-xs">Unsigned</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">PDF only</Badge>
                    )}
                  </div>
                  <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerate(template.id, template.name)}
                      disabled={isThisGenerating}
                      className="gap-1.5 shrink-0"
                  >
                    {isThisGenerating
                      ? <Loader2Icon className="size-3 animate-spin" />
                      : <Share2Icon className="size-3" />}
                    Share Link
                  </Button>
                </div>

                {document?.signedAt && (
                  <p className="text-xs text-muted-foreground">
                    Signed {format(new Date(document.signedAt), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
