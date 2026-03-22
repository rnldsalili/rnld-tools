import { Loader2Icon, Trash2Icon, UserPlusIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Combobox,
  Modal,
  SectionCard,
  SectionCardContent,
  SectionCardHeader,
} from '@workspace/ui';

import type { ComboboxOption } from '@workspace/ui';
import type { LoanAssignment } from '@/app/hooks/use-loan';
import { useAssignLoan, useLoanAssignments, useRevokeLoanAssignment } from '@/app/hooks/use-loan';
import { useUsers } from '@/app/hooks/use-users';

interface ManageAccessTabProps {
  loanId: string;
}

const ASSIGNMENTS_LIMIT = 50;

export function ManageAccessTab({ loanId }: ManageAccessTabProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<LoanAssignment | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const { data: assignmentsData, isLoading: isAssignmentsLoading } = useLoanAssignments({
    loanId,
    page: 1,
    limit: ASSIGNMENTS_LIMIT,
  });
  const { data: usersData, isLoading: isUsersLoading } = useUsers({
    search: '',
    page: 1,
    limit: 20,
  });
  const assignLoanMutation = useAssignLoan();
  const revokeLoanMutation = useRevokeLoanAssignment();

  const assignments: Array<LoanAssignment> = assignmentsData?.data.assignments ?? [];
  const users: Array<{ id: string; name: string; email: string }> = usersData?.data.users ?? [];

  const assignedUserIds = new Set(assignments.map((a) => a.user.id));

  const availableUserOptions: Array<ComboboxOption> = users
    .filter((u) => !assignedUserIds.has(u.id))
    .map((u) => ({
      value: u.id,
      label: u.name,
      keywords: [u.email],
    }));

  async function handleAssign() {
    if (!selectedUserId) {
      toast.error('Please select a user to assign.');
      return;
    }

    try {
      await assignLoanMutation.mutateAsync({
        loanId,
        body: { userId: selectedUserId },
      });
      toast.success('User assigned successfully.');
      setSelectedUserId('');
      setIsAssignDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign user.');
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) {
      return;
    }

    try {
      await revokeLoanMutation.mutateAsync({
        loanId,
        userId: revokeTarget.user.id,
      });
      toast.success('Assignment revoked successfully.');
      setRevokeTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke assignment.');
    }
  }

  return (
    <>
      <SectionCard className="min-w-0">
        <SectionCardHeader className="flex items-center justify-between">
          <span className="text-sm font-semibold">Assigned Users</span>
          <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setIsAssignDialogOpen(true)}
          >
            <UserPlusIcon className="size-3.5" />
            Assign User
          </Button>
        </SectionCardHeader>
        <SectionCardContent>
          {isAssignmentsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : assignments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No users are currently assigned to this loan.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {assignments.map((assignment) => (
                <div
                    key={assignment.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/70 p-3"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{assignment.user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{assignment.user.email}</span>
                    <span className="text-xs text-muted-foreground">
                      Assigned by {assignment.createdBy.name}
                    </span>
                  </div>
                  <Button
                      variant="ghost"
                      className="gap-1.5 shrink-0 text-destructive hover:text-destructive/80"
                      onClick={() => setRevokeTarget(assignment)}
                      disabled={revokeLoanMutation.isPending && revokeLoanMutation.variables.userId === assignment.user.id}
                  >
                    <Trash2Icon className="size-3.5" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </SectionCardContent>
      </SectionCard>

      <Modal
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          title="Assign User to Loan"
          className="sm:max-w-md"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Select User</label>
            <Combobox
                options={availableUserOptions}
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                placeholder="Search for a user..."
                searchPlaceholder="Search by name or email..."
                emptyText="No users found."
                disabled={isUsersLoading || assignLoanMutation.isPending}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
                variant="outline"
                onClick={() => {
                  setIsAssignDialogOpen(false);
                  setSelectedUserId('');
                }}
                disabled={assignLoanMutation.isPending}
            >
              Cancel
            </Button>
            <Button
                onClick={handleAssign}
                disabled={!selectedUserId || assignLoanMutation.isPending}
            >
              {assignLoanMutation.isPending
                ? <Loader2Icon className="size-3.5 animate-spin" />
                : 'Assign'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
          open={revokeTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setRevokeTarget(null);
            }
          }}
          title="Revoke Access"
          className="sm:max-w-sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to revoke access for{' '}
            <span className="font-medium text-foreground">
              {revokeTarget!.user.name}
            </span>{' '}
            ? They will no longer be able to view this loan.
          </p>
          <div className="flex justify-end gap-2">
            <Button
                variant="outline"
                onClick={() => setRevokeTarget(null)}
                disabled={revokeLoanMutation.isPending}
            >
              Cancel
            </Button>
            <Button
                variant="destructive"
                onClick={handleRevoke}
                disabled={revokeLoanMutation.isPending}
            >
              {revokeLoanMutation.isPending
                ? <Loader2Icon className="size-3.5 animate-spin" />
                : 'Revoke Access'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
