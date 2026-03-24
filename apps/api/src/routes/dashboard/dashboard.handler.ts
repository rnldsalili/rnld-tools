import { InstallmentStatus, NotificationLogStatus } from '@workspace/constants';
import { PermissionAction, PermissionModule, roleSlugs } from '@workspace/permissions';
import type { Prisma } from '@/prisma/client';
import { createHandlers } from '@/api/app';
import { userCanAccess } from '@/api/lib/authorization';
import { initializePrisma } from '@/api/lib/db';
import { getAccessibleLoanFilter } from '@/api/lib/loans/access';
import {
  getInstallmentRemainingAmount,
  getInstallmentStatus,
  getManilaDayRange,
} from '@/api/lib/loans/payments';

const RECENT_NOTIFICATION_FAILURE_WINDOW_DAYS = 7;
const DASHBOARD_ATTENTION_ITEMS_LIMIT = 6;

const QUICK_LINKS = [
  {
    id: 'clients',
    title: 'Clients',
    description: 'Open the client directory and borrower records.',
    href: '/clients',
    module: PermissionModule.CLIENTS,
    action: PermissionAction.VIEW,
  },
  {
    id: 'loans',
    title: 'Loans',
    description: 'Review active loans and repayment schedules.',
    href: '/loans',
    module: PermissionModule.LOANS,
    action: PermissionAction.VIEW,
  },
  {
    id: 'documents',
    title: 'Documents',
    description: 'Manage loan document templates and signing defaults.',
    href: '/settings/documents',
    module: PermissionModule.DOCUMENTS,
    action: PermissionAction.VIEW,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Inspect templates, event mappings, and delivery history.',
    href: '/settings/notifications',
    module: PermissionModule.NOTIFICATIONS,
    action: PermissionAction.VIEW,
  },
  {
    id: 'roles',
    title: 'Roles',
    description: 'Review the role matrix and permission coverage.',
    href: '/settings/roles',
    module: PermissionModule.ROLES,
    action: PermissionAction.VIEW,
  },
  {
    id: 'users',
    title: 'Users',
    description: 'Manage accounts, invitations, and role assignments.',
    href: '/settings/users',
    module: PermissionModule.USERS,
    action: PermissionAction.VIEW,
  },
] as const;

type LoanAttentionItem = {
  id: string;
  loanId: string;
  dueDate: string;
  remainingAmount: number;
  currency: string;
  status: string;
  attentionCategory: 'overdue' | 'near_due';
  client: {
    id: string;
    name: string;
  };
};

type QuickLink = {
  id: string;
  title: string;
  description: string;
  href: string;
};

async function getLoanAttentionSummary(prisma: ReturnType<typeof initializePrisma>, authenticatedUser: {
  hasSuperAdminRole: boolean;
  id: string;
}) {
  const referenceDate = new Date();
  const currentManilaDayStart = getManilaDayRange(referenceDate).start;
  const nearDueWindowEnd = getManilaDayRange(referenceDate, 3).start;
  const accessibleLoanFilter = await getAccessibleLoanFilter(prisma, authenticatedUser);

  const baseInstallmentFilter: Prisma.LoanInstallmentWhereInput = {
    paidAt: null,
    status: {
      not: InstallmentStatus.PAID,
    },
    loan: {
      is: accessibleLoanFilter,
    },
  };
  const overdueInstallmentFilter: Prisma.LoanInstallmentWhereInput = {
    ...baseInstallmentFilter,
    dueDate: {
      lt: currentManilaDayStart,
    },
  };
  const nearDueInstallmentFilter: Prisma.LoanInstallmentWhereInput = {
    ...baseInstallmentFilter,
    dueDate: {
      gte: currentManilaDayStart,
      lt: nearDueWindowEnd,
    },
  };

  const installmentSelect = {
    id: true,
    loanId: true,
    dueDate: true,
    amount: true,
    paidAmount: true,
    status: true,
    loan: {
      select: {
        currency: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
  } satisfies Prisma.LoanInstallmentSelect;

  const [overdueCount, nearDueCount, overdueItems, nearDueItems] = await Promise.all([
    prisma.loanInstallment.count({ where: overdueInstallmentFilter }),
    prisma.loanInstallment.count({ where: nearDueInstallmentFilter }),
    prisma.loanInstallment.findMany({
      where: overdueInstallmentFilter,
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      take: DASHBOARD_ATTENTION_ITEMS_LIMIT,
      select: installmentSelect,
    }),
    prisma.loanInstallment.findMany({
      where: nearDueInstallmentFilter,
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      take: DASHBOARD_ATTENTION_ITEMS_LIMIT,
      select: installmentSelect,
    }),
  ]);

  const items = [
    ...mapAttentionItems(overdueItems, referenceDate, currentManilaDayStart, nearDueWindowEnd),
    ...mapAttentionItems(nearDueItems, referenceDate, currentManilaDayStart, nearDueWindowEnd),
  ].slice(0, DASHBOARD_ATTENTION_ITEMS_LIMIT);

  return {
    overdueCount,
    nearDueCount,
    total: overdueCount + nearDueCount,
    items,
  };
}

function mapAttentionItems(
  installments: Array<{
    id: string;
    loanId: string;
    dueDate: Date;
    amount: number;
    paidAmount: number;
    status: string;
    loan: {
      currency: string;
      client: {
        id: string;
        name: string;
      };
    };
  }>,
  referenceDate: Date,
  currentManilaDayStart: Date,
  nearDueWindowEnd: Date,
): Array<LoanAttentionItem> {
  return installments.flatMap((installment) => {
    const normalizedStatus = getInstallmentStatus({
      amount: installment.amount,
      paidAmount: installment.paidAmount,
      dueDate: installment.dueDate,
      currentStatus: installment.status,
      referenceDate,
    });

    if (normalizedStatus === InstallmentStatus.PAID) {
      return [];
    }

    const attentionCategory = installment.dueDate.getTime() < currentManilaDayStart.getTime()
      ? 'overdue'
      : installment.dueDate.getTime() < nearDueWindowEnd.getTime()
        ? 'near_due'
        : null;

    if (!attentionCategory) {
      return [];
    }

    return [{
      id: installment.id,
      loanId: installment.loanId,
      dueDate: installment.dueDate.toISOString(),
      remainingAmount: getInstallmentRemainingAmount(installment.amount, installment.paidAmount),
      currency: installment.loan.currency,
      status: normalizedStatus,
      attentionCategory,
      client: {
        id: installment.loan.client.id,
        name: installment.loan.client.name,
      },
    }];
  });
}

function createQuickLinks(authenticatedUser: Parameters<typeof userCanAccess>[0]): Array<QuickLink> {
  return QUICK_LINKS
    .filter((link) => userCanAccess(authenticatedUser, link.module, link.action))
    .map(({ id, title, description, href }) => ({
      id,
      title,
      description,
      href,
    }));
}

export const getDashboardSummary = createHandlers(async (c) => {
  const prisma = initializePrisma(c.env);
  const authenticatedUser = c.get('user');

  const canViewClients = userCanAccess(
    authenticatedUser,
    PermissionModule.CLIENTS,
    PermissionAction.VIEW,
  );
  const canViewLoans = userCanAccess(
    authenticatedUser,
    PermissionModule.LOANS,
    PermissionAction.VIEW,
  );
  const canViewNotifications = userCanAccess(
    authenticatedUser,
    PermissionModule.NOTIFICATIONS,
    PermissionAction.VIEW,
  );
  const canViewRoles = userCanAccess(
    authenticatedUser,
    PermissionModule.ROLES,
    PermissionAction.VIEW,
  );
  const canViewUsers = userCanAccess(
    authenticatedUser,
    PermissionModule.USERS,
    PermissionAction.VIEW,
  );

  const overviewCardPromises = [
    canViewClients
      ? prisma.client.count().then((totalClients) => ({
          id: 'clients',
          title: 'Clients',
          value: totalClients,
          description: `${totalClients === 1 ? 'Borrower record' : 'Borrower records'} in the workspace`,
          href: '/clients',
        }))
      : null,
    canViewLoans
      ? getAccessibleLoanFilter(prisma, authenticatedUser).then(async (loanFilter) => {
          const totalLoans = await prisma.loan.count({ where: loanFilter });
          return {
            id: 'loans',
            title: 'Loans',
            value: totalLoans,
            description: `${totalLoans === 1 ? 'Accessible loan' : 'Accessible loans'} in your queue`,
            href: '/loans',
          };
        })
      : null,
  ].filter((promise): promise is NonNullable<typeof promise> => promise !== null);

  const recentFailureWindowStart = new Date();
  recentFailureWindowStart.setDate(
    recentFailureWindowStart.getDate() - RECENT_NOTIFICATION_FAILURE_WINDOW_DAYS,
  );

  const [overviewCards, loanAttention, usersCount, notificationTemplateCount, failedLogsCount] = await Promise.all([
    Promise.all(overviewCardPromises),
    canViewLoans ? getLoanAttentionSummary(prisma, authenticatedUser) : Promise.resolve(null),
    canViewUsers ? prisma.user.count() : Promise.resolve(null),
    canViewNotifications ? prisma.notificationTemplate.count() : Promise.resolve(null),
    canViewNotifications
      ? prisma.notificationLog.count({
          where: {
            status: NotificationLogStatus.FAILED,
            queuedAt: {
              gte: recentFailureWindowStart,
            },
          },
        })
      : Promise.resolve(null),
  ]);

  return c.json({
    meta: { code: 200, message: 'Dashboard summary retrieved successfully' },
    data: {
      overviewCards,
      quickLinks: createQuickLinks(authenticatedUser),
      ...(loanAttention ? {
        loanAttention,
      } : {}),
      ...((canViewUsers || canViewRoles) ? {
        accessSnapshot: {
          ...(canViewUsers && usersCount !== null ? { usersCount } : {}),
          ...(canViewRoles ? { rolesCount: roleSlugs.length } : {}),
        },
      } : {}),
      ...(canViewNotifications && notificationTemplateCount !== null && failedLogsCount !== null ? {
        notificationSnapshot: {
          templatesCount: notificationTemplateCount,
          recentFailedLogsCount: failedLogsCount,
          recentWindowDays: RECENT_NOTIFICATION_FAILURE_WINDOW_DAYS,
        },
      } : {}),
    },
  }, 200);
});
