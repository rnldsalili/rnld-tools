import { createFileRoute } from '@tanstack/react-router';
import { HandCoinsIcon } from 'lucide-react';
import { PermissionAction, PermissionModule } from '@workspace/permissions';
import { useCan } from '@workspace/permissions/react';
import { UnauthorizedState } from '@/app/components/authorization/unauthorized-state';
import { CreateLoanForm } from '@/app/components/loans/create-loan-form';
import { AuthenticatedDetailPageShell } from '@/app/components/layout/authenticated-detail-page-shell';

export const Route = createFileRoute('/_authenticated/(loans)/loans/new')({
  head: () => ({ meta: [{ title: 'RTools - New Loan' }] }),
  staticData: { title: 'New Loan' },
  component: NewLoanPage,
});

function NewLoanPage() {
  const canCreateLoans = useCan(PermissionModule.LOANS, PermissionAction.CREATE);

  if (!canCreateLoans) {
    return (
      <UnauthorizedState
          title="Loan Creation Restricted"
          description="You do not have permission to create new loans."
      />
    );
  }

  return (
    <AuthenticatedDetailPageShell
        icon={HandCoinsIcon}
        title="New Loan"
        description="Create a loan and configure its repayment schedule in a dedicated page that is easier to use on mobile."
        backgroundClassName="bg-background"
        surface="plain"
        showHeader={false}
    >
      <CreateLoanForm />
    </AuthenticatedDetailPageShell>
  );
}
