import { format } from 'date-fns';
import {
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  Loader2Icon,
  PenSquareIcon,
  Share2Icon,
  Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Modal,
} from '@workspace/ui';
import type { DocumentToken } from '@/app/hooks/use-document-links';
import { useCreateDocumentLink, useDeleteDocumentLink, useDocumentLinks } from '@/app/hooks/use-document-links';

interface ShareDocumentDialogProps {
  loanId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getDocumentUrl(token: string) {
  return `${window.location.origin}/documents/${token}`;
}

function DocumentTokenRow({
  token: t,
  loanId,
}: {
  token: DocumentToken;
  loanId: string;
}) {
  const [copied, setCopied] = useState(false);
  const { mutateAsync: deleteLink, isPending: isDeleting } = useDeleteDocumentLink();

  async function handleCopy() {
    await navigator.clipboard.writeText(getDocumentUrl(t.token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRevoke() {
    try {
      await deleteLink({ loanId, token: t.token });
      toast.success('Document link revoked.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke.');
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2 flex-wrap">
        {t.isExpired ? (
          <Badge variant="destructive" className="text-xs">Expired</Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Active</Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {t.isExpired
            ? `Expired ${format(new Date(t.expiresAt), 'MMM d, yyyy')}`
            : `Expires ${format(new Date(t.expiresAt), 'MMM d, yyyy')}`}
        </span>
        <span className="text-xs text-muted-foreground">
          · Created {format(new Date(t.createdAt), 'MMM d, yyyy')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate text-xs bg-muted rounded px-2 py-1 font-mono">
          {getDocumentUrl(t.token)}
        </code>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={handleCopy}>
          {copied ? <CheckIcon className="size-3.5 text-green-500" /> : <CopyIcon className="size-3.5" />}
        </Button>
        {!t.isExpired && (
          <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-destructive hover:text-destructive"
              onClick={handleRevoke}
              disabled={isDeleting}
          >
            {isDeleting ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );
}

export function ShareDocumentDialog({ loanId, open, onOpenChange }: ShareDocumentDialogProps) {
  const { data, isLoading } = useDocumentLinks(loanId);
  const { mutateAsync: createLink, isPending: isGenerating, variables: generatingVars } = useCreateDocumentLink();
  const templateEntries = data?.data.templates ?? [];

  async function handleGenerate(templateId: string) {
    try {
      await createLink({ loanId, templateId });
      toast.success('Document link generated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate link.');
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
          {templateEntries.map(({ template, tokens, document }) => {
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
                      onClick={() => handleGenerate(template.id)}
                      disabled={isThisGenerating}
                      className="gap-1.5 shrink-0"
                  >
                    {isThisGenerating
                      ? <Loader2Icon className="size-3 animate-spin" />
                      : <Share2Icon className="size-3" />}
                    Generate Link
                  </Button>
                </div>

                {document?.signedAt && (
                  <p className="text-xs text-muted-foreground">
                    Signed {format(new Date(document.signedAt), 'MMM d, yyyy h:mm a')}
                  </p>
                )}

                {tokens.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {tokens.map((t) => (
                      <DocumentTokenRow key={t.token} token={t} loanId={loanId} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No links generated yet.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
