import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async findAllBySchool(schoolId: string) {
    return this.prisma.teacher.findMany({
      where: { schoolId },
      include: {
        subjects: {
          include: {
            subject: true,
          },
        },
        assignments: {
          include: {
            class: true,
            section: true,
          },
        },
      },
      orderBy: { nameBn: 'asc' },
    });
  }

  async findOne(schoolId: string, id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, schoolId },
      include: {
        subjects: {
          include: {
            subject: true,
          },
        },
        assignments: {
          include: {
            class: true,
            section: true,
          },
        },
      },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    return teacher;
  }

  async create(schoolId: string, data: any) {
    const existing = await this.prisma.teacher.findFirst({
      where: { teacherCode: data.teacherCode },
    });
    if (existing) {
      throw new ConflictException('Teacher code already exists');
    }

    return this.prisma.teacher.create({
      data: {
        schoolId,
        teacherCode: data.teacherCode,
        nameBn: data.nameBn,
        nameEn: data.nameEn,
        designation: data.designation || 'Assistant Teacher',
        phone: data.phone,
        email: data.email,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
      },
    });
  }

  async update(schoolId: string, id: string, data: any) {
    await this.findOne(schoolId, id);
    return this.prisma.teacher.update({
      where: { id },
      data: {
        nameBn: data.nameBn,
        nameEn: data.nameEn,
        designation: data.designation,
        phone: data.phone,
        email: data.email,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
      },
    });
  }

  async remove(schoolId: string, id: string) {
    await this.findOne(schoolId, id);
    return this.prisma.teacher.delete({
      where: { id },
    });
  }

  async assignClass(schoolId: string, teacherId: string, data: { classId: string; sectionId?: string; isClassTeacher?: boolean; academicYear?: number }) {
    return this.prisma.classAssignment.create({
      data: {
        teacherId,
        classId: data.classId,
        sectionId: data.sectionId,
        isClassTeacher: data.isClassTeacher || false,
        academicYear: data.academicYear || 2026,
      },
    });
  }

  async assignSubject(teacherId: string, subjectId: string) {
    return this.prisma.teacherSubject.create({
      data: {
        teacherId,
        subjectId,
      },
    });
  }
}
