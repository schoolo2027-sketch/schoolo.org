import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async getSchoolById(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        classes: {
          include: {
            sections: true,
            subjects: true,
          },
        },
      },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }
    return school;
  }

  async createSchool(data: { name: string; code: string; eiin?: string; address?: string; phone?: string; email?: string }) {
    return this.prisma.school.create({
      data,
    });
  }

  async updateSchool(id: string, data: any) {
    return this.prisma.school.update({
      where: { id },
      data,
    });
  }

  async getStats(schoolId: string) {
    const [totalStudents, totalTeachers, totalClasses, totalInvoices, totalPaidAmount] = await Promise.all([
      this.prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
      this.prisma.teacher.count({ where: { schoolId } }),
      this.prisma.class.count({ where: { schoolId } }),
      this.prisma.feeInvoice.count({ where: { student: { schoolId } } }),
      this.prisma.payment.aggregate({
        where: { invoice: { student: { schoolId } } },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalInvoices,
      totalRevenue: totalPaidAmount._sum.amount || 0,
    };
  }

  async getSettings(schoolId: string) {
    const settings = await this.prisma.schoolSetting.findMany({
      where: { schoolId },
    });
    const result: Record<string, string> = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    return result;
  }

  async saveSetting(schoolId: string, key: string, value: string) {
    return this.prisma.schoolSetting.upsert({
      where: {
        schoolId_key: {
          schoolId,
          key,
        },
      },
      update: { value },
      create: { schoolId, key, value },
    });
  }
}
