import { createFileRoute } from '@tanstack/react-router';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { format } from 'date-fns';
import {
  DownloadIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Share2Icon,
} from 'lucide-react';
import { useState } from 'react';
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
  InstallmentStatus,
} from '@workspace/constants';
import type { ColumnDef } from '@tanstack/react-table';
import type { LoanInstallment } from '@/app/hooks/use-loan';
import { useLoan } from '@/app/hooks/use-loan';
import { useDocumentLinks } from '@/app/hooks/use-document-links';
import { formatCurrency } from '@/app/lib/format';
import { AddInstallmentDialog } from '@/app/components/loans/add-installment-dialog';
import { EditInstallmentDialog } from '@/app/components/loans/edit-installment-dialog';
import { EditLoanDialog } from '@/app/components/loans/edit-loan-dialog';
import { InstallmentStatusBadge } from '@/app/components/loans/installment-status-badge';
import { MarkPaidDialog } from '@/app/components/loans/mark-paid-dialog';
import { ShareDocumentDialog } from '@/app/components/loans/share-document-dialog';
import { DocumentPDFDocument } from '@/app/components/loans/document-pdf-document';

export const Route = createFileRoute('/_authenticated/(loans)/loans/$loanId')({
  head: () => ({ meta: [{ title: 'RTools - Loan Detail' }] }),
  staticData: { title: 'Loan Detail' },
  component: LoanDetailPage,
});

function LoanDetailPage() {
  const { loanId } = Route.useParams();
  const [installmentsPage, setInstallmentsPage] = useState(1);
  const [selectedInstallment, setSelectedInstallment] = useState<LoanInstallment | null>(null);
  const [markPaidInstallment, setMarkPaidInstallment] = useState<LoanInstallment | null>(null);
  const [isEditLoanOpen, setIsEditLoanOpen] = useState(false);
  const [isAddInstallmentOpen, setIsAddInstallmentOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const { data, isLoading } = useLoan({
    loanId,
    page: installmentsPage,
    limit: INSTALLMENTS_LIMIT,
  });

  const { data: documentLinksData } = useDocumentLinks(loanId);

  const loan = data?.data.loan;
  const installments = loan?.installments ?? [];
  const installmentsPagination = loan?.installmentsPagination;

  const maybeTemplateEntries = (documentLinksData as { data?: { templates?: unknown } } | undefined)?.data?.templates;
  const templateEntries = Array.isArray(maybeTemplateEntries)
    ? maybeTemplateEntries
    : [];

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
          {row.original.status !== InstallmentStatus.PAID && (
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
          )}
          <button
              type="button"
              className="font-medium text-foreground transition-colors hover:text-primary"
              onClick={() => setSelectedInstallment(row.original)}
          >
            Edit
          </button>
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
                    <LoanField label="Borrower" value={loan.borrower} />
                    <LoanField label="Amount" value={formatCurrency(loan.amount, loan.currency)} />
                    <LoanField
                        label="Installment Interval"
                        value={INSTALLMENT_INTERVAL_LABELS[
                          loan.installmentInterval as keyof typeof INSTALLMENT_INTERVAL_LABELS
                        ]}
                    />
                    <LoanField
                        label="Interest Rate"
                        value={loan.interestRate != null ? `${loan.interestRate}%` : '—'}
                    />
                    <LoanField label="Phone" value={loan.phone ?? '—'} />
                    <LoanField label="Email" value={loan.email ?? '—'} />
                    <LoanField label="Created" value={format(new Date(loan.createdAt), 'MMM d, yyyy')} />
                    <LoanField label="Updated" value={format(new Date(loan.updatedAt), 'MMM d, yyyy')} />
                  </div>
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
                  {templateEntries.map(({ template, tokens, document }) => (
                    <div key={template.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{template.name}</span>
                          {document?.signedAt ? (
                            <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs">Signed</Badge>
                          ) : tokens.length > 0 ? (
                            <Badge variant="secondary" className="text-xs">Unsigned</Badge>
                          ) : null}
                        </div>
                        {loan && template.content && (
                          <PDFDownloadLink
                              document={(
                                <DocumentPDFDocument
                                    loan={loan}
                                    title={template.name}
                                    content={template.content as never}
                                    requiresSignature={template.requiresSignature}
                                    signatureUrl={document?.signatureUrl ?? null}
                                    signedAt={document?.signedAt ? String(document.signedAt) : null}
                                />
                              )}
                              fileName={`${template.name.replace(/\s+/g, '-').toLowerCase()}-${loan.borrower.replace(/\s+/g, '-').toLowerCase()}.pdf`}
                          >
                            {({ loading }) => (
                              <Button variant="ghost" size="sm" className="gap-1.5 shrink-0 h-6 text-xs" disabled={loading}>
                                {loading ? <Loader2Icon className="size-3 animate-spin" /> : <DownloadIcon className="size-3" />}
                                PDF
                              </Button>
                            )}
                          </PDFDownloadLink>
                        )}
                      </div>
                      {document?.signedAt && (
                        <p className="text-xs text-muted-foreground">
                          Signed on {format(new Date(document.signedAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                      {tokens.length > 0 && (
                        <div className="flex flex-col gap-1">
                          {tokens.map((t) => (
                            <div
                                key={t.token}
                                className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                            >
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
                            </div>
                          ))}
                        </div>
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
              <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setIsAddInstallmentOpen(true)}
                  disabled={isLoading || !loan}
              >
                <PlusIcon className="size-3.5" />
                Add Installment
              </Button>
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
      {selectedInstallment && (
        <EditInstallmentDialog
            loanId={loanId}
            installment={selectedInstallment}
            onClose={() => setSelectedInstallment(null)}
        />
      )}

      {/* Mark as Paid Dialog */}
      {markPaidInstallment && loan && (
        <MarkPaidDialog
            loanId={loanId}
            installment={markPaidInstallment}
            currency={loan.currency}
            onClose={() => setMarkPaidInstallment(null)}
        />
      )}

      {/* Add Installment Dialog */}
      {loan && (
        <AddInstallmentDialog
            loanId={loanId}
            open={isAddInstallmentOpen}
            onOpenChange={setIsAddInstallmentOpen}
        />
      )}

      {/* Edit Loan Dialog */}
      {isEditLoanOpen && loan && (
        <EditLoanDialog
            loan={loan}
            onClose={() => setIsEditLoanOpen(false)}
        />
      )}

      {/* Share Document Dialog */}
      {loan && (
        <ShareDocumentDialog
            loanId={loanId}
            open={isShareDialogOpen}
            onOpenChange={setIsShareDialogOpen}
        />
      )}
    </div>
  );
}

function LoanField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-all">{value}</span>
    </div>
  );
}
