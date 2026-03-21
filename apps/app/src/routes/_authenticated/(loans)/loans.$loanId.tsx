import { createFileRoute, useRouter } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  DownloadIcon,
  Loader2Icon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  Share2Icon,
  Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  DataTable,
  FileDropzone,
  Pagination,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
} from '@workspace/ui';
import {
  INSTALLMENTS_LIMIT,
  INSTALLMENT_INTERVAL_LABELS,
  INSTALLMENT_INTERVAL_VALUES,
  InstallmentStatus,
  LOAN_ATTACHMENT_ACCEPT_ATTRIBUTE,
  LOAN_ATTACHMENT_MAX_SIZE_BYTES,
  LOAN_LOG_EVENT_LABELS,
  LoanLogEventType,
} from '@workspace/constants';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { Can, useCan } from '@workspace/permissions/react';
import type { ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { LoanAttachment } from '@/app/hooks/use-loan-attachments';
import type { LoanActivityLog, LoanInstallment } from '@/app/hooks/use-loan';
import type { DocumentLinkTemplateEntry } from '@/app/hooks/use-document-links';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { ClientStatusBadge } from '@/app/components/clients/client-status-badge';
import { ConfirmDeleteDialog } from '@/app/components/confirm-delete-dialog';
import { AddInstallmentDialog } from '@/app/components/loans/add-installment-dialog';
import { EditInstallmentDialog } from '@/app/components/loans/edit-installment-dialog';
import { EditLoanDialog } from '@/app/components/loans/edit-loan-dialog';
import { InstallmentPaymentHistoryDialog } from '@/app/components/loans/installment-payment-history-dialog';
import { InstallmentStatusBadge } from '@/app/components/loans/installment-status-badge';
import { RecordPaymentDialog } from '@/app/components/loans/mark-paid-dialog';
import { ShareDocumentDialog } from '@/app/components/loans/share-document-dialog';
import { useDocumentLinks, useDownloadLoanDocumentPdf } from '@/app/hooks/use-document-links';
import {
  useCreateLoanAttachment,
  useDeleteLoanAttachment,
  useDownloadLoanAttachment,
  useLoanAttachments,
} from '@/app/hooks/use-loan-attachments';
import { useDeleteLoan, useLoan, useLoanLogs } from '@/app/hooks/use-loan';
import { formatCurrency } from '@/app/lib/format';
import { isOneOf, isPlainRecord } from '@/app/lib/value-guards';

const LOAN_LOGS_LIMIT = 10;

export const Route = createFileRoute('/_authenticated/(loans)/loans/$loanId')({
  head: () => ({ meta: [{ title: 'RTools - Loan Detail' }] }),
  staticData: { title: 'Loan Detail' },
  component: LoanDetailPage,
});

function LoanDetailPage() {
  const router = useRouter();
  const { loanId } = Route.useParams();
  const [installmentsPage, setInstallmentsPage] = useState(1);
  const [loanLogsPage, setLoanLogsPage] = useState(1);
  const [selectedInstallment, setSelectedInstallment] = useState<LoanInstallment | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<LoanAttachment | null>(null);
  const [paymentInstallment, setPaymentInstallment] = useState<LoanInstallment | null>(null);
  const [paymentHistoryInstallment, setPaymentHistoryInstallment] = useState<LoanInstallment | null>(null);
  const [isEditLoanOpen, setIsEditLoanOpen] = useState(false);
  const [isAddInstallmentOpen, setIsAddInstallmentOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

  const canViewLoans = useCan(PermissionModule.LOANS, PermissionAction.VIEW);
  const canUpdateLoans = useCan(PermissionModule.LOANS, PermissionAction.UPDATE);

  const { data, isLoading } = useLoan({
    loanId,
    page: installmentsPage,
    limit: INSTALLMENTS_LIMIT,
  });
  const {
    data: loanLogsData,
    isLoading: isLoanLogsLoading,
  } = useLoanLogs({
    loanId,
    page: loanLogsPage,
    limit: LOAN_LOGS_LIMIT,
  });
  const { mutateAsync: deleteLoan, isPending: isDeletePending } = useDeleteLoan();
  const { data: attachmentsData, isLoading: isAttachmentsLoading } = useLoanAttachments(loanId);
  const createLoanAttachmentMutation = useCreateLoanAttachment();
  const deleteLoanAttachmentMutation = useDeleteLoanAttachment();
  const downloadLoanAttachmentMutation = useDownloadLoanAttachment();

  const { data: documentLinksData } = useDocumentLinks(loanId);
  const downloadLoanDocumentPdfMutation = useDownloadLoanDocumentPdf();

  const loan = data?.data.loan;
  const attachments: Array<LoanAttachment> = attachmentsData?.data.attachments ?? [];
  const installments = loan?.installments ?? [];
  const installmentsPagination = loan?.installmentsPagination;
  const loanLogs = loanLogsData?.data.logs ?? [];
  const loanLogsPagination = loanLogsData?.data.pagination;
  const templateEntries: Array<DocumentLinkTemplateEntry> = documentLinksData?.data.templates ?? [];
  const activeDownloadTemplateId = downloadLoanDocumentPdfMutation.isPending
    ? downloadLoanDocumentPdfMutation.variables.templateId
    : null;
  const activeAttachmentDownloadId = downloadLoanAttachmentMutation.isPending
    ? downloadLoanAttachmentMutation.variables.attachmentId
    : null;
  const installmentIntervalLabel = loan && isOneOf(INSTALLMENT_INTERVAL_VALUES, loan.installmentInterval)
    ? INSTALLMENT_INTERVAL_LABELS[loan.installmentInterval as keyof typeof INSTALLMENT_INTERVAL_LABELS]
    : loan?.installmentInterval;

  if (!canViewLoans) {
    return (
      <UnauthorizedState
          title="Loan Access Restricted"
          description="You do not have permission to view loan details."
      />
    );
  }

  async function handleDeleteLoan() {
    try {
      await deleteLoan(loanId);
      setIsDeleteDialogOpen(false);
      toast.success('Loan deleted successfully.');
      await router.navigate({ to: '/loans' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete loan.');
    }
  }

  async function uploadAttachmentFiles(attachmentFiles: Array<File>) {
    if (attachmentFiles.length === 0) {
      return;
    }

    setIsUploadingAttachments(true);

    let uploadedCount = 0;
    const failedUploads: Array<string> = [];

    try {
      for (const attachmentFile of attachmentFiles) {
        try {
          await createLoanAttachmentMutation.mutateAsync({
            loanId,
            form: { file: attachmentFile },
          });
          uploadedCount += 1;
        } catch (error) {
          failedUploads.push(
            `${attachmentFile.name}: ${error instanceof Error ? error.message : 'Upload failed.'}`,
          );
        }
      }

      if (uploadedCount > 0) {
        toast.success(
          uploadedCount === 1
            ? '1 attachment uploaded successfully.'
            : `${uploadedCount} attachments uploaded successfully.`,
        );
      }

      if (failedUploads.length > 0) {
        toast.error(failedUploads[0]);
      }
    } finally {
      setIsUploadingAttachments(false);
    }
  }

  async function handleDeleteAttachment() {
    if (!selectedAttachment) {
      return;
    }

    try {
      await deleteLoanAttachmentMutation.mutateAsync({
        loanId,
        attachmentId: selectedAttachment.id,
      });
      toast.success('Attachment deleted successfully.');
      setSelectedAttachment(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete attachment.');
    }
  }

  const installmentColumns: Array<ColumnDef<LoanInstallment>> = [
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => format(new Date(row.original.dueDate), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => formatCurrency(row.original.amount, loan?.currency ?? 'PHP'),
    },
    {
      accessorKey: 'paidAmount',
      header: 'Paid',
      cell: ({ row }) => formatCurrency(row.original.paidAmount, loan?.currency ?? 'PHP'),
    },
    {
      accessorKey: 'remainingAmount',
      header: 'Remaining',
      cell: ({ row }) => formatCurrency(row.original.remainingAmount, loan?.currency ?? 'PHP'),
    },
    {
      accessorKey: 'paymentCount',
      header: 'Payments',
      cell: ({ row }) => row.original.paymentCount,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <InstallmentStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'paidAt',
      header: 'Paid At',
      cell: ({ row }) =>
        row.original.paidAt ? (
          format(new Date(row.original.paidAt), 'MMM d, yyyy')
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.remarks ?? '—'}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end text-sm">
          <button
              type="button"
              className="font-medium text-foreground transition-colors hover:text-primary"
              onClick={() => setPaymentHistoryInstallment(row.original)}
          >
            History
          </button>
          {row.original.remainingAmount > 0 ? (
            <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
              <>
                <span className="mx-2 h-4 w-px bg-border" aria-hidden="true" />
                <button
                    type="button"
                    className="font-medium text-foreground transition-colors hover:text-primary"
                    onClick={() => setPaymentInstallment(row.original)}
                >
                  Record Payment
                </button>
              </>
            </Can>
          ) : null}
          <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
            <>
              <span className="mx-2 h-4 w-px bg-border" aria-hidden="true" />
              <button
                  type="button"
                  className="font-medium text-foreground transition-colors hover:text-primary"
                  onClick={() => setSelectedInstallment(row.original)}
              >
                Edit
              </button>
            </>
          </Can>
        </div>
      ),
    },
  ];

  const loanLogColumns: Array<ColumnDef<LoanActivityLog>> = [
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.createdAt), 'MMM d, yyyy h:mm a'),
    },
    {
      accessorKey: 'eventType',
      header: 'Event',
      cell: ({ row }) => (
        <Badge variant="outline">
          {getLoanLogEventLabel(row.original.eventType)}
        </Badge>
      ),
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.actorUser?.name ?? 'System'}
        </span>
      ),
    },
    {
      id: 'details',
      header: 'Details',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {getLoanLogSummary(row.original, loan?.currency ?? 'PHP')}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <SectionCard className="min-w-0">
            <SectionCardHeader className="flex items-center justify-between">
              <span className="text-sm font-semibold">Loan Details</span>
              {loan ? (
                <div className="flex items-center gap-1">
                  <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
                    <>
                      <Button
                          variant="ghost"
                          className="gap-1.5"
                          onClick={() => setIsShareDialogOpen(true)}
                      >
                        <Share2Icon className="size-3.5" />
                        Share
                      </Button>
                      <Button
                          variant="ghost"
                          className="gap-1.5"
                          onClick={() => setIsEditLoanOpen(true)}
                      >
                        <PencilIcon className="size-3.5" />
                        Edit
                      </Button>
                    </>
                  </Can>
                  <Can I={PermissionAction.DELETE} a={PermissionModule.LOANS}>
                    <Button
                        variant="ghost"
                        className="gap-1.5 text-destructive hover:text-destructive/80"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        disabled={isDeletePending}
                    >
                      <Trash2Icon className="size-3.5" />
                      Delete
                    </Button>
                  </Can>
                </div>
              ) : null}
            </SectionCardHeader>
            <SectionCardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-4 w-full animate-pulse rounded-sm bg-muted" />
                  ))}
                </div>
              ) : loan ? (
                <div className="flex flex-col gap-3">
                  <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
                    <LoanField
                        label="Client"
                        value={loan.client.name}
                        trailing={<ClientStatusBadge status={loan.client.status} />}
                    />
                    <LoanField label="Amount" value={formatCurrency(loan.amount, loan.currency)} />
                    <LoanField label="Installment Interval" value={installmentIntervalLabel ?? '—'} />
                    <LoanField label="Loan Date" value={format(new Date(loan.loanDate), 'MMM d, yyyy')} />
                    <LoanField
                        label="Interest Rate"
                        value={loan.interestRate != null ? `${loan.interestRate}%` : '—'}
                    />
                    <LoanField label="Updated" value={format(new Date(loan.updatedAt), 'MMM d, yyyy')} />
                    <LoanField label="Phone" value={loan.client.phone ?? '—'} />
                    <LoanField label="Email" value={loan.client.email ?? '—'} />
                    <LoanField label="Total Excess" value={formatCurrency(loan.excessBalance, loan.currency)} />
                    <LoanField label="Address" value={loan.client.address ?? '—'} />
                  </div>
                  {loan.description ? (
                    <div className="border-t border-border pt-3">
                      <LoanField label="Description" value={loan.description} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </SectionCardContent>
          </SectionCard>

          <SectionCard className="min-w-0">
            <SectionCardHeader>
              <span className="text-sm font-semibold">Documents</span>
            </SectionCardHeader>
            <SectionCardContent>
              {templateEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No document templates configured.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {templateEntries.map(({ template, document }: DocumentLinkTemplateEntry) => (
                    <div key={template.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{template.name}</span>
                          {document?.signedAt ? (
                            <Badge className="bg-green-600 text-xs text-white hover:bg-green-600">Signed</Badge>
                          ) : template.requiresSignature ? (
                            <Badge variant="secondary" className="text-xs">Unsigned</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">PDF only</Badge>
                          )}
                        </div>
                        {loan ? (
                          <Button
                              variant="ghost"
                              className="shrink-0"
                              disabled={
                                downloadLoanDocumentPdfMutation.isPending
                                && activeDownloadTemplateId === template.id
                              }
                              onClick={async () => {
                                try {
                                  await downloadLoanDocumentPdfMutation.mutateAsync({
                                    fileName: `${template.name.replace(/\s+/g, '-').toLowerCase()}-${loan.client.name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
                                    loanId,
                                    templateId: template.id,
                                  });
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : 'Failed to download document PDF.',
                                  );
                                }
                              }}
                          >
                            {downloadLoanDocumentPdfMutation.isPending
                              && activeDownloadTemplateId === template.id ? (
                                <Loader2Icon className="size-3 animate-spin" />
                              ) : (
                                <DownloadIcon className="size-3" />
                              )}
                            PDF
                          </Button>
                        ) : null}
                      </div>
                      {document?.signedAt ? (
                        <p className="text-xs text-muted-foreground">
                          Signed on {format(new Date(document.signedAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </SectionCardContent>
          </SectionCard>
        </div>

        <SectionCard className="min-w-0">
          <SectionCardHeader className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Attachments</span>
              {!isAttachmentsLoading ? (
                <Badge className="border-0 bg-muted text-xs text-muted-foreground">
                  {attachments.length}
                </Badge>
              ) : null}
            </div>
          </SectionCardHeader>
          <SectionCardContent>
            {isAttachmentsLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
                  <FileDropzone
                      title="Drag and drop files here"
                      activeTitle="Release to upload attachments"
                      description={(
                        <>
                          Supports images, PDF, Word, Excel, and CSV up to {formatAttachmentSize(LOAN_ATTACHMENT_MAX_SIZE_BYTES)} each.
                        </>
                      )}
                      accept={LOAN_ATTACHMENT_ACCEPT_ATTRIBUTE}
                      multiple
                      isPending={isUploadingAttachments}
                      onFilesSelected={uploadAttachmentFiles}
                  />
                </Can>

                {attachments.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-4">
                    <p className="text-sm font-medium">No attachments yet.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload images, PDF, Word, Excel, or CSV files up to {formatAttachmentSize(LOAN_ATTACHMENT_MAX_SIZE_BYTES)}.
                    </p>
                  </div>
                ) : null}

                {attachments.map((attachment) => (
                  <div
                      key={attachment.id}
                      className="flex flex-col gap-3 rounded-md border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-md bg-muted p-2 text-muted-foreground">
                        <PaperclipIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium">{attachment.fileName}</span>
                          <Badge variant="outline">{getAttachmentTypeLabel(attachment)}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatAttachmentSize(attachment.sizeBytes)}
                          {' • '}
                          Uploaded {format(new Date(attachment.createdAt), 'MMM d, yyyy h:mm a')}
                          {' • '}
                          {attachment.createdBy?.name ?? 'Unknown uploader'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <Button
                          variant="ghost"
                          className="gap-1.5"
                          disabled={
                            downloadLoanAttachmentMutation.isPending
                            && activeAttachmentDownloadId === attachment.id
                          }
                          onClick={async () => {
                            try {
                              await downloadLoanAttachmentMutation.mutateAsync({
                                loanId,
                                attachmentId: attachment.id,
                                fileName: attachment.fileName,
                              });
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : 'Failed to download attachment.',
                              );
                            }
                          }}
                      >
                        {downloadLoanAttachmentMutation.isPending
                          && activeAttachmentDownloadId === attachment.id ? (
                            <Loader2Icon className="size-3 animate-spin" />
                          ) : (
                            <DownloadIcon className="size-3" />
                          )}
                        Download
                      </Button>
                      <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
                        <Button
                            variant="ghost"
                            className="gap-1.5 text-destructive hover:text-destructive/80"
                            onClick={() => setSelectedAttachment(attachment)}
                            disabled={
                              deleteLoanAttachmentMutation.isPending
                              && deleteLoanAttachmentMutation.variables.attachmentId === attachment.id
                            }
                        >
                          <Trash2Icon className="size-3.5" />
                          Delete
                        </Button>
                      </Can>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCardContent>
        </SectionCard>

        <DataTable
            columns={installmentColumns}
            data={installments}
            isLoading={isLoading}
            getRowClassName={(row) => {
              const isOverdue = row.status === InstallmentStatus.PENDING && new Date(row.dueDate) < new Date();
              return isOverdue ? 'bg-destructive/10 hover:bg-destructive/15' : undefined;
            }}
            toolbar={(
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Installments</span>
                {!isLoading && installmentsPagination ? (
                  <Badge className="border-0 bg-muted text-xs text-muted-foreground">
                    {installmentsPagination.total}
                  </Badge>
                ) : null}
              </div>
              <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
                <Button
                    className="gap-1.5"
                    onClick={() => setIsAddInstallmentOpen(true)}
                    disabled={isLoading || !loan}
                >
                  <PlusIcon className="size-3.5" />
                  Add Installment
                </Button>
              </Can>
            </div>
          )}
            footer={
            installmentsPagination && installmentsPagination.totalPages > 1 ? (
              <Pagination
                  page={installmentsPage}
                  totalPages={installmentsPagination.totalPages}
                  onPageChange={setInstallmentsPage}
                  isLoading={isLoading}
              />
            ) : undefined
          }
        />

        <DataTable
            columns={loanLogColumns}
            data={loanLogs}
            isLoading={isLoanLogsLoading}
            toolbar={(
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Activity Log</span>
                {!isLoanLogsLoading && loanLogsPagination ? (
                  <Badge className="border-0 bg-muted text-xs text-muted-foreground">
                    {loanLogsPagination.total}
                  </Badge>
                ) : null}
              </div>
            </div>
          )}
            footer={
            loanLogsPagination && loanLogsPagination.totalPages > 1 ? (
              <Pagination
                  page={loanLogsPage}
                  totalPages={loanLogsPagination.totalPages}
                  onPageChange={setLoanLogsPage}
                  isLoading={isLoanLogsLoading}
              />
            ) : undefined
          }
        />
      </div>

      {selectedInstallment ? (
        <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
          <EditInstallmentDialog
              loanId={loanId}
              installment={selectedInstallment}
              onClose={() => setSelectedInstallment(null)}
          />
        </Can>
      ) : null}

      {paymentInstallment && loan ? (
        <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
          <RecordPaymentDialog
              loanId={loanId}
              installment={paymentInstallment}
              currency={loan.currency}
              excessBalance={loan.excessBalance}
              onClose={() => setPaymentInstallment(null)}
          />
        </Can>
      ) : null}

      {paymentHistoryInstallment && loan ? (
        <InstallmentPaymentHistoryDialog
            loanId={loanId}
            installment={paymentHistoryInstallment}
            currency={loan.currency}
            canVoidPayments={canUpdateLoans}
            onClose={() => setPaymentHistoryInstallment(null)}
        />
      ) : null}

      {loan ? (
        <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
          <AddInstallmentDialog
              loanId={loanId}
              open={isAddInstallmentOpen}
              onOpenChange={setIsAddInstallmentOpen}
          />
        </Can>
      ) : null}

      {isEditLoanOpen && loan ? (
        <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
          <EditLoanDialog
              loan={loan}
              onClose={() => setIsEditLoanOpen(false)}
          />
        </Can>
      ) : null}

      {loan ? (
        <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
          <ShareDocumentDialog
              loanId={loanId}
              open={isShareDialogOpen}
              onOpenChange={setIsShareDialogOpen}
          />
        </Can>
      ) : null}

      <Can I={PermissionAction.DELETE} a={PermissionModule.LOANS}>
        <ConfirmDeleteDialog
            open={isDeleteDialogOpen}
            onOpenChange={(open) => {
              if (!isDeletePending) {
                setIsDeleteDialogOpen(open);
              }
            }}
            title="Delete Loan"
            description="This will permanently remove the loan, its attachments, installments, payment history, loan logs, signed documents, document logs, and stored files."
            confirmLabel="Delete Loan"
            isPending={isDeletePending}
            onConfirm={handleDeleteLoan}
        />
      </Can>

      <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
        <ConfirmDeleteDialog
            open={selectedAttachment !== null}
            onOpenChange={(open) => {
              if (!deleteLoanAttachmentMutation.isPending && !open) {
                setSelectedAttachment(null);
              }
            }}
            title="Delete Attachment"
            description={
              selectedAttachment
                ? `This will permanently remove "${selectedAttachment.fileName}" from this loan.`
                : 'This will permanently remove the selected attachment from this loan.'
            }
            confirmLabel="Delete Attachment"
            isPending={deleteLoanAttachmentMutation.isPending}
            onConfirm={handleDeleteAttachment}
        />
      </Can>
    </div>
  );
}

function LoanField({
  label,
  trailing,
  value,
  className,
}: {
  label: string;
  trailing?: ReactNode;
  value: string;
  className?: string;
}) {
  return (
    <div className={className ? `flex flex-col gap-1 ${className}` : 'flex flex-col gap-1'}>
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        {trailing}
      </span>
      <span className="wrap-break-word text-sm font-medium">{value}</span>
    </div>
  );
}

function getLoanLogEventLabel(eventType: string) {
  return isOneOf(Object.values(LoanLogEventType), eventType)
    ? LOAN_LOG_EVENT_LABELS[eventType]
    : eventType;
}

function getLoanLogSummary(log: LoanActivityLog, currency: string) {
  const eventData = isPlainRecord(log.eventData) ? log.eventData : null;

  switch (log.eventType) {
    case LoanLogEventType.PAYMENT_RECORDED:
      return [
        `Applied ${formatCurrency(getNumberValue(eventData, 'appliedAmount'), currency)}.`,
        `Cash ${formatCurrency(getNumberValue(eventData, 'cashAmount'), currency)}.`,
        `Excess used ${formatCurrency(getNumberValue(eventData, 'excessAppliedAmount'), currency)}.`,
        `New excess ${formatCurrency(getNumberValue(eventData, 'excessCreatedAmount'), currency)}.`,
        `Remaining ${formatCurrency(getNumberValue(eventData, 'remainingAmountAfter'), currency)}.`,
      ].join(' ');
    case LoanLogEventType.PAYMENT_VOIDED:
      return [
        `Voided payment worth ${formatCurrency(getNumberValue(eventData, 'appliedAmount'), currency)}.`,
        `Remaining ${formatCurrency(getNumberValue(eventData, 'remainingAmountAfter'), currency)}.`,
        getStringValue(eventData, 'voidReason') ? `Reason: ${getStringValue(eventData, 'voidReason')}.` : null,
      ].filter(Boolean).join(' ');
    case LoanLogEventType.INSTALLMENT_ADDED:
    case LoanLogEventType.INSTALLMENT_DELETED:
      return [
        `Amount ${formatCurrency(getNumberValue(eventData, 'amount'), currency)}.`,
        getStringValue(eventData, 'dueDate') ? `Due ${format(new Date(getStringValue(eventData, 'dueDate')), 'MMM d, yyyy')}.` : null,
      ].filter(Boolean).join(' ');
    case LoanLogEventType.INSTALLMENT_UPDATED:
    case LoanLogEventType.LOAN_UPDATED:
      return getChangeSummary(eventData);
    case LoanLogEventType.LOAN_CREATED:
      return [
        `Loan amount ${formatCurrency(getNumberValue(eventData, 'amount'), currency)}.`,
        getStringValue(eventData, 'loanDate') ? `Loan date ${format(new Date(getStringValue(eventData, 'loanDate')), 'MMM d, yyyy')}.` : null,
      ].filter(Boolean).join(' ');
    case LoanLogEventType.ATTACHMENT_UPLOADED:
      return [
        getStringValue(eventData, 'fileName') ? `Uploaded ${getStringValue(eventData, 'fileName')}.` : 'Attachment uploaded.',
        getNumberValue(eventData, 'sizeBytes') > 0
          ? `Size ${formatAttachmentSize(getNumberValue(eventData, 'sizeBytes'))}.`
          : null,
      ].filter(Boolean).join(' ');
    case LoanLogEventType.ATTACHMENT_DELETED:
      return [
        getStringValue(eventData, 'fileName') ? `Deleted ${getStringValue(eventData, 'fileName')}.` : 'Attachment deleted.',
        getNumberValue(eventData, 'sizeBytes') > 0
          ? `Size ${formatAttachmentSize(getNumberValue(eventData, 'sizeBytes'))}.`
          : null,
      ].filter(Boolean).join(' ');
    default:
      return 'Activity recorded.';
  }
}

function getChangeSummary(eventData: Record<string, unknown> | null) {
  const changes = eventData && isPlainRecord(eventData.changes) ? eventData.changes : null;
  if (!changes) {
    return 'Updated.';
  }

  const changedFields = Object.keys(changes).map((key) => key.replace(/([A-Z])/g, ' $1').toLowerCase());
  return changedFields.length > 0
    ? `Updated ${changedFields.join(', ')}.`
    : 'Updated.';
}

function formatAttachmentSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return '0 B';
  }

  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(sizeBytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  if (sizeBytes >= 1024) {
    return `${(sizeBytes / 1024).toFixed(sizeBytes >= 10 * 1024 ? 0 : 1)} KB`;
  }

  return `${sizeBytes} B`;
}

function getAttachmentTypeLabel(attachment: LoanAttachment) {
  const fileNameParts = attachment.fileName.split('.');
  const fileExtension = fileNameParts.length > 1
    ? fileNameParts[fileNameParts.length - 1]?.trim().toUpperCase()
    : '';

  if (fileExtension) {
    return fileExtension;
  }

  return attachment.contentType.startsWith('image/') ? 'IMAGE' : 'FILE';
}

function getNumberValue(source: Record<string, unknown> | null, key: string) {
  const value = source?.[key];
  return typeof value === 'number' ? value : 0;
}

function getStringValue(source: Record<string, unknown> | null, key: string) {
  const value = source?.[key];
  return typeof value === 'string' ? value : '';
}
