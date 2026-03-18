import { createFileRoute, useRouter } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  DownloadIcon,
  Loader2Icon,
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
} from '@workspace/constants';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { Can, useCan } from '@workspace/permissions/react';
import type { ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { LoanInstallment } from '@/app/hooks/use-loan';
import type { DocumentLinkTemplateEntry } from '@/app/hooks/use-document-links';
import { ClientStatusBadge } from '@/app/components/clients/client-status-badge';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { ConfirmDeleteDialog } from '@/app/components/confirm-delete-dialog';
import { useDeleteLoan, useLoan } from '@/app/hooks/use-loan';
import { useDocumentLinks, useDownloadLoanDocumentPdf } from '@/app/hooks/use-document-links';
import { AddInstallmentDialog } from '@/app/components/loans/add-installment-dialog';
import { EditInstallmentDialog } from '@/app/components/loans/edit-installment-dialog';
import { EditLoanDialog } from '@/app/components/loans/edit-loan-dialog';
import { InstallmentStatusBadge } from '@/app/components/loans/installment-status-badge';
import { MarkPaidDialog } from '@/app/components/loans/mark-paid-dialog';
import { ShareDocumentDialog } from '@/app/components/loans/share-document-dialog';
import { formatCurrency } from '@/app/lib/format';
import { isOneOf } from '@/app/lib/value-guards';

export const Route = createFileRoute('/_authenticated/(loans)/loans/$loanId')({
  head: () => ({ meta: [{ title: 'RTools - Loan Detail' }] }),
  staticData: { title: 'Loan Detail' },
  component: LoanDetailPage,
});

function LoanDetailPage() {
  const router = useRouter();
  const { loanId } = Route.useParams();
  const [installmentsPage, setInstallmentsPage] = useState(1);
  const [selectedInstallment, setSelectedInstallment] = useState<LoanInstallment | null>(null);
  const [markPaidInstallment, setMarkPaidInstallment] = useState<LoanInstallment | null>(null);
  const [isEditLoanOpen, setIsEditLoanOpen] = useState(false);
  const [isAddInstallmentOpen, setIsAddInstallmentOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data, isLoading } = useLoan({
    loanId,
    page: installmentsPage,
    limit: INSTALLMENTS_LIMIT,
  });
  const { mutateAsync: deleteLoan, isPending: isDeletePending } = useDeleteLoan();

  const { data: documentLinksData } = useDocumentLinks(loanId);
  const downloadLoanDocumentPdfMutation = useDownloadLoanDocumentPdf();

  const loan = data?.data.loan;
  const installments = loan?.installments ?? [];
  const installmentsPagination = loan?.installmentsPagination;
  const templateEntries: Array<DocumentLinkTemplateEntry> = documentLinksData?.data.templates ?? [];
  const activeDownloadTemplateId = downloadLoanDocumentPdfMutation.isPending
    ? downloadLoanDocumentPdfMutation.variables.templateId
    : null;
  const installmentIntervalLabel = loan && isOneOf(INSTALLMENT_INTERVAL_VALUES, loan.installmentInterval)
    ? INSTALLMENT_INTERVAL_LABELS[loan.installmentInterval]
    : loan?.installmentInterval;
  const canViewLoans = useCan(PermissionModule.LOANS, PermissionAction.VIEW);

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

  const columns: Array<ColumnDef<LoanInstallment>> = [
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
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.remarks ?? '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end text-sm">
          {row.original.status !== InstallmentStatus.PAID ? (
            <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
              <>
                <button
                    type="button"
                    className="font-medium text-foreground transition-colors hover:text-primary"
                    onClick={() => setMarkPaidInstallment(row.original)}
                >
                  Mark as Paid
                </button>
                <span className="mx-2 h-4 w-px bg-border" aria-hidden="true" />
              </>
            </Can>
          ) : null}
          <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
            <button
                type="button"
                className="font-medium text-foreground transition-colors hover:text-primary"
                onClick={() => setSelectedInstallment(row.original)}
            >
              Edit
            </button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4">
        {/* Row 1: Loan Details (left) | Documents (right) */}
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {/* Loan Details */}
          <SectionCard className="min-w-0">
            <SectionCardHeader className="flex justify-between items-center">
              <span className="text-sm font-semibold">Loan Details</span>
              {loan && (
                <div className="flex items-center gap-1">
                  <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
                    <>
                      <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setIsShareDialogOpen(true)}
                      >
                        <Share2Icon className="size-3.5" />
                        Share
                      </Button>
                      <Button
                          variant="ghost"
                          size="sm"
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
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive/80"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        disabled={isDeletePending}
                    >
                      <Trash2Icon className="size-3.5" />
                      Delete
                    </Button>
                  </Can>
                </div>
              )}
            </SectionCardHeader>
            <SectionCardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-4 w-full animate-pulse rounded-sm bg-muted" />
                  ))}
                </div>
              ) : loan ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:grid-cols-2">
                    <LoanField
                        label="Client"
                        value={loan.client.name}
                        trailing={<ClientStatusBadge status={loan.client.status} />}
                    />
                    <LoanField label="Amount" value={formatCurrency(loan.amount, loan.currency)} />
                    <LoanField
                        label="Installment Interval"
                        value={installmentIntervalLabel ?? '—'}
                    />
                    <LoanField
                        label="Interest Rate"
                        value={loan.interestRate != null ? `${loan.interestRate}%` : '—'}
                    />
                    <LoanField label="Phone" value={loan.client.phone ?? '—'} />
                    <LoanField label="Email" value={loan.client.email ?? '—'} />
                    <LoanField label="Loan Date" value={format(new Date(loan.loanDate), 'MMM d, yyyy')} />
                    <LoanField label="Updated" value={format(new Date(loan.updatedAt), 'MMM d, yyyy')} />
                  </div>
                  <LoanField label="Address" value={loan.client.address ?? '—'} />
                  {loan.description && (
                    <div className="border-t border-border pt-3">
                      <LoanField label="Description" value={loan.description} />
                    </div>
                  )}
                </div>
              ) : null}
            </SectionCardContent>
          </SectionCard>

          {/* Documents */}
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
                            <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs">Signed</Badge>
                          ) : template.requiresSignature ? (
                            <Badge variant="secondary" className="text-xs">Unsigned</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">PDF only</Badge>
                          )}
                        </div>
                        {loan && (
                          <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 shrink-0 h-6 text-xs"
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
                        )}
                      </div>
                      {document?.signedAt && (
                        <p className="text-xs text-muted-foreground">
                          Signed on {format(new Date(document.signedAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCardContent>
          </SectionCard>
        </div>

        {/* Row 2: Installments (full width) */}
        <DataTable
            columns={columns}
            data={installments}
            isLoading={isLoading}
            getRowClassName={(row) => {
              const isOverdue =
                row.status === InstallmentStatus.PENDING &&
                new Date(row.dueDate) < new Date();
              return isOverdue ? 'bg-destructive/10 hover:bg-destructive/15' : undefined;
            }}
            toolbar={(
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Installments</span>
                {!isLoading && installmentsPagination && (
                  <Badge className="bg-muted text-muted-foreground border-0 text-xs">
                    {installmentsPagination.total}
                  </Badge>
                )}
              </div>
              <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
                <Button
                    size="sm"
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
      </div>

      {/* Edit Installment Dialog */}
      {selectedInstallment ? (
        <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
        <EditInstallmentDialog
            loanId={loanId}
            installment={selectedInstallment}
            onClose={() => setSelectedInstallment(null)}
        />
        </Can>
      ) : null}

      {/* Mark as Paid Dialog */}
      {markPaidInstallment && loan ? (
        <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
        <MarkPaidDialog
            loanId={loanId}
            installment={markPaidInstallment}
            currency={loan.currency}
            onClose={() => setMarkPaidInstallment(null)}
        />
        </Can>
      ) : null}

      {/* Add Installment Dialog */}
      {loan ? (
        <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
        <AddInstallmentDialog
            loanId={loanId}
            open={isAddInstallmentOpen}
            onOpenChange={setIsAddInstallmentOpen}
        />
        </Can>
      ) : null}

      {/* Edit Loan Dialog */}
      {isEditLoanOpen && loan ? (
        <Can I={PermissionAction.UPDATE} a={PermissionModule.LOANS}>
        <EditLoanDialog
            loan={loan}
            onClose={() => setIsEditLoanOpen(false)}
        />
        </Can>
      ) : null}

      {/* Share Document Dialog */}
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
            description="This will permanently remove the loan, its installments, signed documents, document logs, and stored signature files."
            confirmLabel="Delete Loan"
            isPending={isDeletePending}
            onConfirm={handleDeleteLoan}
        />
      </Can>
    </div>
  );
}

function LoanField({
  label,
  trailing,
  value,
}: {
  label: string;
  trailing?: ReactNode;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        {trailing}
      </span>
      <span className="text-sm font-medium break-all">{value}</span>
    </div>
  );
}
