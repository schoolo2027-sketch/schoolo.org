import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveMarkDto } from './dto/save-mark.dto';

@Injectable()
export class MarksService {
  constructor(private prisma: PrismaService) {}

  // বাংলাদেশ জাতীয় শিক্ষাক্রম ভিত্তিক গ্রেডিং ও জিপিএ ক্যালকুলেশন
  calculateGrade(totalMarks: number, fullMarks: number = 100): { grade: string; gpa: number; isPassed: boolean } {
    const percentage = (totalMarks / fullMarks) * 100;
    if (percentage >= 80) return { grade: 'A+', gpa: 5.0, isPassed: true };
    if (percentage >= 70) return { grade: 'A', gpa: 4.0, isPassed: true };
    if (percentage >= 60) return { grade: 'A-', gpa: 3.5, isPassed: true };
    if (percentage >= 50) return { grade: 'B', gpa: 3.0, isPassed: true };
    if (percentage >= 40) return { grade: 'C', gpa: 2.0, isPassed: true };
    if (percentage >= 33) return { grade: 'D', gpa: 1.0, isPassed: true };
    return { grade: 'F', gpa: 0.0, isPassed: false };
  }

  async saveMark(dto: SaveMarkDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const total = Number(dto.cqMarks) + Number(dto.mcqMarks) + Number(dto.pracMarks);
    
    // পাস/ফেল পৃথক সেগমেন্ট চেক
    let isPassed = true;
    if (subject.cqFull > 0 && dto.cqMarks < subject.cqPass) isPassed = false;
    if (subject.mcqFull > 0 && dto.mcqMarks < subject.mcqPass) isPassed = false;
    if (subject.pracFull > 0 && dto.pracMarks < subject.pracPass) isPassed = false;

    const { grade, gpa } = this.calculateGrade(total, subject.fullMarks);
    const finalGrade = isPassed ? grade : 'F';
    const finalGpa = isPassed ? gpa : 0.0;

    return this.prisma.mark.upsert({
      where: {
        examId_studentId_subjectId: {
          examId: dto.examId,
          studentId: dto.studentId,
          subjectId: dto.subjectId,
        },
      },
      update: {
        cqMarks: dto.cqMarks,
        mcqMarks: dto.mcqMarks,
        pracMarks: dto.pracMarks,
        totalMarks: total,
        grade: finalGrade,
        gpa: finalGpa,
        isPassed,
      },
      create: {
        examId: dto.examId,
        studentId: dto.studentId,
        subjectId: dto.subjectId,
        cqMarks: dto.cqMarks,
        mcqMarks: dto.mcqMarks,
        pracMarks: dto.pracMarks,
        totalMarks: total,
        grade: finalGrade,
        gpa: finalGpa,
        isPassed,
      },
    });
  }

  // মেধা তালিকা ও জেনারেটেড মার্কশিট (৪র্থ বিষয় সহ)
  async getStudentMarksheet(examId: string, studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        marks: {
          where: { examId },
          include: { subject: true },
        },
      },
    });

    if (!student) throw new NotFoundException('Student not found');

    let totalMarksObtained = 0;
    let totalGpaPoints = 0;
    let hasFailed = false;
    let countedSubjects = 0;

    student.marks.forEach((m) => {
      totalMarksObtained += m.totalMarks;

      const isOptional =
        m.subject.isOptional ||
        student.fourthSubjectId === m.subjectId ||
        (student.optionalSubject &&
          (m.subject.nameBn === student.optionalSubject ||
            m.subject.nameEn === student.optionalSubject ||
            m.subject.code === student.optionalSubject));

      if (!m.isPassed && !isOptional) {
        hasFailed = true;
      }

      // ৪র্থ বিষয় থাকলে ২ পয়েন্ট বাদ দিয়ে যোগ (Bangladesh NCTB / Board rule)
      if (isOptional) {
        const bonusGpa = Math.max(0, m.gpa - 2.0);
        totalGpaPoints += bonusGpa;
      } else {
        totalGpaPoints += m.gpa;
        countedSubjects++;
      }
    });

    const finalGpa = hasFailed
      ? 0.0
      : Math.min(5.0, Number((totalGpaPoints / (countedSubjects || 1)).toFixed(2)));

    return {
      student,
      summary: {
        totalMarksObtained,
        finalGpa,
        hasFailed,
        resultStatus: hasFailed ? 'FAILED' : 'PASSED',
      },
    };
  }
}
