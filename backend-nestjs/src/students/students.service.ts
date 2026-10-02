import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, dto: CreateStudentDto) {
    const existing = await this.prisma.student.findFirst({
      where: {
        schoolId,
        studentId: dto.studentId,
      },
    });
    if (existing) {
      throw new ConflictException('Student ID already exists in this school');
    }

    return this.prisma.student.create({
      data: {
        schoolId,
        studentId: dto.studentId,
        nameBn: dto.nameBn,
        nameEn: dto.nameEn,
        rollNumber: dto.rollNumber,
        classId: dto.classId,
        sectionId: dto.sectionId,
        guardianPhone: dto.guardianPhone,
        gender: dto.gender,
        fourthSubjectId: dto.fourthSubjectId,
        optionalSubject: dto.optionalSubject || dto.fourthSubjectId,
        groupSubjects: dto.groupSubjects,
      },
      include: {
        class: true,
        section: true,
      },
    });
  }

  async findAllBySchool(schoolId: string, classId?: string, sectionId?: string) {
    const where: any = { schoolId, status: 'ACTIVE' };
    if (classId) where.classId = classId;
    if (sectionId) where.sectionId = sectionId;

    return this.prisma.student.findMany({
      where,
      include: {
        class: true,
        section: true,
      },
      orderBy: { rollNumber: 'asc' },
    });
  }

  async findOne(schoolId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId },
      include: {
        class: true,
        section: true,
        marks: {
          include: { subject: true, exam: true },
        },
        attendances: {
          take: 30,
          orderBy: { date: 'desc' },
        },
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }
}
