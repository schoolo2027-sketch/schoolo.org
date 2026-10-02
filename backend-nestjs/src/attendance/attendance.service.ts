import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async getStudentAttendance(schoolId: string, classId: string, dateStr: string, sectionId?: string) {
    const targetDate = new Date(dateStr);
    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        classId,
        ...(sectionId ? { sectionId } : {}),
        status: 'ACTIVE',
      },
      include: {
        attendances: {
          where: {
            date: targetDate,
          },
        },
      },
      orderBy: { rollNumber: 'asc' },
    });

    return students.map((s) => ({
      studentId: s.id,
      studentCode: s.studentId,
      nameBn: s.nameBn,
      nameEn: s.nameEn,
      rollNumber: s.rollNumber,
      status: s.attendances[0]?.status || 'PRESENT',
      remarks: s.attendances[0]?.remarks || '',
    }));
  }

  async saveStudentAttendanceBulk(dateStr: string, records: Array<{ studentId: string; status: string; remarks?: string }>) {
    const targetDate = new Date(dateStr);
    const operations = records.map((record) =>
      this.prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: record.studentId,
            date: targetDate,
          },
        },
        update: {
          status: record.status,
          remarks: record.remarks,
        },
        create: {
          studentId: record.studentId,
          date: targetDate,
          status: record.status,
          remarks: record.remarks,
        },
      }),
    );

    return this.prisma.$transaction(operations);
  }

  async getStudentAttendanceSummary(schoolId: string, classId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const students = await this.prisma.student.findMany({
      where: { schoolId, classId, status: 'ACTIVE' },
      include: {
        attendances: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
      orderBy: { rollNumber: 'asc' },
    });

    return students.map((s) => {
      const total = s.attendances.length;
      const present = s.attendances.filter((a) => a.status === 'PRESENT').length;
      const absent = s.attendances.filter((a) => a.status === 'ABSENT').length;
      const late = s.attendances.filter((a) => a.status === 'LATE').length;
      const leave = s.attendances.filter((a) => a.status === 'LEAVE').length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

      return {
        studentId: s.id,
        nameBn: s.nameBn,
        rollNumber: s.rollNumber,
        total,
        present,
        absent,
        late,
        leave,
        percentage,
      };
    });
  }

  async getTeacherAttendance(schoolId: string, dateStr: string) {
    const targetDate = new Date(dateStr);
    const teachers = await this.prisma.teacher.findMany({
      where: { schoolId },
      orderBy: { nameBn: 'asc' },
    });

    const attendances = await this.prisma.teacherAttendance.findMany({
      where: {
        schoolId,
        date: targetDate,
      },
    });

    const attMap = new Map(attendances.map((a) => [a.teacherId, a]));

    return teachers.map((t) => ({
      teacherId: t.id,
      nameBn: t.nameBn,
      designation: t.designation,
      teacherCode: t.teacherCode,
      status: attMap.get(t.id)?.status || 'PRESENT',
      inTime: attMap.get(t.id)?.inTime || '',
      outTime: attMap.get(t.id)?.outTime || '',
      remarks: attMap.get(t.id)?.remarks || '',
    }));
  }

  async saveTeacherAttendanceBulk(schoolId: string, dateStr: string, records: Array<{ teacherId: string; status: string; inTime?: string; outTime?: string; remarks?: string }>) {
    const targetDate = new Date(dateStr);
    const operations = records.map((record) =>
      this.prisma.teacherAttendance.upsert({
        where: {
          teacherId_date: {
            teacherId: record.teacherId,
            date: targetDate,
          },
        },
        update: {
          status: record.status,
          inTime: record.inTime,
          outTime: record.outTime,
          remarks: record.remarks,
        },
        create: {
          schoolId,
          teacherId: record.teacherId,
          date: targetDate,
          status: record.status,
          inTime: record.inTime,
          outTime: record.outTime,
          remarks: record.remarks,
        },
      }),
    );

    return this.prisma.$transaction(operations);
  }
}
