import { differenceInYears } from 'date-fns';

import { dashboardSummaryQuerySchema } from './dashboard.schema';
import { createHandlers } from '@/api/app';
import { initializePrisma } from '@/api/lib/db';
import { replaceImageKeysWithPresignedUrls } from '@/api/lib/image-url-transformer';
import { validate } from '@/api/lib/validator';


const getBirthMonth = (date: Date) => date.getUTCMonth() + 1;
const getBirthDay = (date: Date) => date.getUTCDate();

export const getDashboardSummary = createHandlers(
  validate('query', dashboardSummaryQuerySchema),
  async (c) => {
    const { year, month } = c.req.valid('query');
    const prisma = initializePrisma(c.env);

    const [totalMembers, totalFamilies, membersWithDob] = await Promise.all([
      prisma.member.count(),
      prisma.family.count(),
      prisma.member.findMany({
        where: {
          dateOfBirth: { not: null },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          suffix: true,
          image: true,
          gender: true,
          dateOfBirth: true,
          family: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const now = new Date();
    const counts = {
      kids: 0,
      youth: 0,
      ufm: 0,
      ufw: 0,
    };

    const birthdays = membersWithDob
      .filter((member) => member.dateOfBirth && getBirthMonth(member.dateOfBirth) === month)
      .sort((a, b) => {
        const dayA = a.dateOfBirth ? getBirthDay(a.dateOfBirth) : 0;
        const dayB = b.dateOfBirth ? getBirthDay(b.dateOfBirth) : 0;
        if (dayA !== dayB) return dayA - dayB;
        return a.lastName.localeCompare(b.lastName);
      });
    const birthdaysWithPresignedImages = await replaceImageKeysWithPresignedUrls(
      c.env,
      birthdays,
    );

    for (const member of membersWithDob) {
      if (!member.dateOfBirth) continue;
      const age = differenceInYears(now, member.dateOfBirth);
      if (age < 0) continue;

      if (age <= 13) {
        counts.kids += 1;
      }
      if (age >= 13 && age <= 30) {
        counts.youth += 1;
      }
      if (age > 30) {
        if (member.gender === 'MALE') {
          counts.ufm += 1;
        } else {
          counts.ufw += 1;
        }
      }
    }

    return c.json({
      meta: {
        code: 200,
        message: 'Dashboard summary retrieved successfully',
      },
      data: {
        context: {
          year,
          month,
        },
        totals: {
          members: totalMembers,
          families: totalFamilies,
        },
        counts,
        birthdays: birthdaysWithPresignedImages,
      },
    }, 200);
  },
);
