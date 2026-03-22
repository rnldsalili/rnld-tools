import { RoleSlug } from '@workspace/permissions';
import {
  loanAssignmentCreateSchema,
  loanAssignmentListQuerySchema,
  loanIdParamSchema,
  userIdParamSchema,
} from './loans.assignments.schema';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { validate } from '@/api/lib/validator';

export const getLoanAssignments = createHandlers(
  validate('param', loanIdParamSchema),
  validate('query', loanAssignmentListQuerySchema),
  async (c) => {
    const { loanId } = c.req.valid('param');
    const { page, limit } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const skipCount = (page - 1) * limit;

    const [assignments, totalAssignments] = await Promise.all([
      prisma.loanAssignment.findMany({
        where: { loanId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: skipCount,
        take: limit,
      }),
      prisma.loanAssignment.count({ where: { loanId } }),
    ]);

    return c.json({
      meta: { code: 200, message: 'Loan assignments retrieved successfully' },
      data: {
        assignments,
        pagination: {
          page,
          limit,
          total: totalAssignments,
          totalPages: Math.ceil(totalAssignments / limit),
        },
      },
    }, 200);
  },
);

export const assignLoanUser = createHandlers(
  validate('param', loanIdParamSchema),
  validate('json', loanAssignmentCreateSchema),
  async (c) => {
    const { loanId } = c.req.valid('param');
    const { userId } = c.req.valid('json');
    const authenticatedUser = c.get('user');
    const prisma = initializePrisma(c.env);

    const loanFound = await prisma.loan.findUnique({
      where: { id: loanId },
      select: { id: true },
    });
    if (!loanFound) {
      return c.json({ meta: { code: 404, message: 'Loan not found' } }, 404);
    }

    const userToAssign = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: true,
      },
    });
    if (!userToAssign) {
      return c.json({ meta: { code: 404, message: 'User not found' } }, 404);
    }

    const isSuperAdmin = userToAssign.userRoles.some((ur) => ur.roleSlug === RoleSlug.SUPER_ADMIN);
    if (isSuperAdmin) {
      return c.json({ meta: { code: 422, message: 'Cannot assign a super admin to a loan' } }, 422);
    }

    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        roleSlug: { in: userToAssign.userRoles.map((ur) => ur.roleSlug) },
        module: 'loans',
        action: 'view',
      },
    });
    const canViewLoans = rolePermissions.length > 0;

    if (!canViewLoans) {
      return c.json({
        meta: { code: 422, message: 'User does not have permission to view loans' },
      }, 422);
    }

    const existingAssignment = await prisma.loanAssignment.findUnique({
      where: { loanId_userId: { loanId, userId } },
    });
    if (existingAssignment) {
      return c.json({ meta: { code: 409, message: 'User is already assigned to this loan' } }, 409);
    }

    const assignment = await prisma.loanAssignment.create({
      data: {
        loanId,
        userId,
        createdByUserId: authenticatedUser.id,
        updatedByUserId: authenticatedUser.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return c.json({
      meta: { code: 201, message: 'User assigned to loan successfully' },
      data: { assignment },
    }, 201);
  },
);

export const revokeLoanAssignment = createHandlers(
  validate('param', loanIdParamSchema),
  validate('param', userIdParamSchema),
  async (c) => {
    const { loanId, userId } = c.req.valid('param');
    const prisma = initializePrisma(c.env);

    const existingAssignment = await prisma.loanAssignment.findUnique({
      where: { loanId_userId: { loanId, userId } },
    });
    if (!existingAssignment) {
      return c.json({ meta: { code: 404, message: 'Assignment not found' } }, 404);
    }

    await prisma.loanAssignment.delete({
      where: { loanId_userId: { loanId, userId } },
    });

    return c.json({
      meta: { code: 200, message: 'Assignment revoked successfully' },
      data: {},
    }, 200);
  },
);
