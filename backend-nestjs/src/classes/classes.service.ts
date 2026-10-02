import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string) {
    return this.prisma.class.findMany({
      where: { schoolId },
      include: {
        sections: true,
        subjects: true,
        _count: {
          select: { students: true },
        },
      },
      orderBy: { numericValue: 'asc' },
    });
  }

  async findOne(schoolId: string, id: string) {
    const classItem = await this.prisma.class.findFirst({
      where: { id, schoolId },
      include: {
        sections: true,
        subjects: true,
        students: {
          orderBy: { rollNumber: 'asc' },
        },
      },
    });
    if (!classItem) {
      throw new NotFoundException('Class not found');
    }
    return classItem;
  }

  async createClass(schoolId: string, data: { name: string; numericValue: number }) {
    return this.prisma.class.create({
      data: {
        schoolId,
        name: data.name,
        numericValue: data.numericValue,
      },
    });
  }

  async createSection(classId: string, data: { name: string; shift?: string }) {
    return this.prisma.section.create({
      data: {
        classId,
        name: data.name,
        shift: data.shift || 'Day',
      },
    });
  }

  async getSubjects(schoolId: string, classId: string) {
    return this.prisma.subject.findMany({
      where: { schoolId, classId },
      orderBy: { code: 'asc' },
    });
  }

  async createSubject(schoolId: string, classId: string, data: any) {
    return this.prisma.subject.create({
      data: {
        schoolId,
        classId,
        nameBn: data.nameBn,
        nameEn: data.nameEn,
        code: data.code,
        group: data.group,
        isOptional: data.isOptional || false,
        fullMarks: data.fullMarks || 100,
        passMarks: data.passMarks || 33,
        cqFull: data.cqFull || 70,
        cqPass: data.cqPass || 23,
        mcqFull: data.mcqFull || 30,
        mcqPass: data.mcqPass || 10,
        pracFull: data.pracFull || 0,
        pracPass: data.pracPass || 0,
      },
    });
  }

  async removeSubject(subjectId: string) {
    return this.prisma.subject.delete({
      where: { id: subjectId },
    });
  }
}
