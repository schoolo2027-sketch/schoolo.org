import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeesService {
  constructor(private prisma: PrismaService) {}

  async getFeeTypes(schoolId: string) {
    return this.prisma.feeType.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFeeType(schoolId: string, data: { name: string; amount: number; frequency?: string }) {
    return this.prisma.feeType.create({
      data: {
        schoolId,
        name: data.name,
        amount: data.amount,
        frequency: data.frequency || 'MONTHLY',
      },
    });
  }

  async getInvoices(schoolId: string, classId?: string, status?: string, studentId?: string) {
    const where: any = {
      student: { schoolId },
    };
    if (studentId) where.studentId = studentId;
    if (classId) where.student.classId = classId;
    if (status) where.status = status;

    return this.prisma.feeInvoice.findMany({
      where,
      include: {
        student: {
          include: {
            class: true,
            section: true,
          },
        },
        feeType: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generateInvoices(schoolId: string, feeTypeId: string, classId?: string, dueDateStr?: string) {
    const feeType = await this.prisma.feeType.findFirst({
      where: { id: feeTypeId, schoolId },
    });
    if (!feeType) {
      throw new NotFoundException('Fee type not found');
    }

    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        ...(classId ? { classId } : {}),
        status: 'ACTIVE',
      },
    });

    const dueDate = dueDateStr ? new Date(dueDateStr) : null;
    const now = new Date();
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    let count = 0;
    for (const student of students) {
      const invoiceNo = `${prefix}-${student.rollNumber}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await this.prisma.feeInvoice.create({
        data: {
          studentId: student.id,
          feeTypeId: feeType.id,
          invoiceNo,
          totalAmount: feeType.amount,
          paidAmount: 0,
          dueAmount: feeType.amount,
          status: 'UNPAID',
          dueDate,
        },
      });
      count++;
    }

    return { message: `Generated ${count} invoices successfully`, count };
  }

  async recordPayment(data: { invoiceId: string; amount: number; paymentMethod: string; trxId?: string }) {
    const invoice = await this.prisma.feeInvoice.findUnique({
      where: { id: data.invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (data.amount > invoice.dueAmount) {
      throw new BadRequestException('Payment amount cannot exceed due amount');
    }

    const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
    const newPaid = invoice.paidAmount + data.amount;
    const newDue = invoice.totalAmount - newPaid;
    const newStatus = newDue <= 0 ? 'PAID' : 'PARTIAL';

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: data.amount,
          paymentMethod: data.paymentMethod || 'CASH',
          trxId: data.trxId,
          receiptNo,
        },
      }),
      this.prisma.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaid,
          dueAmount: newDue,
          status: newStatus,
        },
      }),
    ]);

    return payment;
  }

  async getExpenses(schoolId: string, startDate?: string, endDate?: string) {
    const where: any = { schoolId };
    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    return this.prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    });
  }

  async createExpense(schoolId: string, data: any) {
    return this.prisma.expense.create({
      data: {
        schoolId,
        category: data.category || 'OTHER',
        title: data.title,
        amount: Number(data.amount),
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        paidTo: data.paidTo,
        paidBy: data.paidBy,
        voucherNo: data.voucherNo || `VOUCH-${Date.now().toString().slice(-6)}`,
        description: data.description,
      },
    });
  }

  async getPayrolls(schoolId: string, month?: string, year?: number) {
    const where: any = { schoolId };
    if (month) where.month = month;
    if (year) where.year = year;

    return this.prisma.payroll.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
    });
  }

  async createPayroll(schoolId: string, data: any) {
    const baseSalary = Number(data.baseSalary);
    const bonus = Number(data.bonus || 0);
    const deduction = Number(data.deduction || 0);
    const netSalary = baseSalary + bonus - deduction;

    return this.prisma.payroll.create({
      data: {
        schoolId,
        employeeType: data.employeeType || 'TEACHER',
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        month: data.month,
        year: Number(data.year) || new Date().getFullYear(),
        baseSalary,
        bonus,
        deduction,
        netSalary,
        paymentMethod: data.paymentMethod || 'CASH',
        receiptNo: `PAY-${Date.now().toString().slice(-6)}`,
        remarks: data.remarks,
      },
    });
  }

  async getFinancialSummary(schoolId: string, year: number) {
    const [totalIncome, totalExpense, totalSalary] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { invoice: { student: { schoolId } } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { schoolId },
        _sum: { amount: true },
      }),
      this.prisma.payroll.aggregate({
        where: { schoolId, year },
        _sum: { netSalary: true },
      }),
    ]);

    const income = totalIncome._sum.amount || 0;
    const expense = (totalExpense._sum.amount || 0) + (totalSalary._sum.netSalary || 0);
    const balance = income - expense;

    return {
      totalIncome: income,
      totalExpense: expense,
      salaryExpense: totalSalary._sum.netSalary || 0,
      generalExpense: totalExpense._sum.amount || 0,
      netBalance: balance,
      academicYear: year,
    };
  }
}
