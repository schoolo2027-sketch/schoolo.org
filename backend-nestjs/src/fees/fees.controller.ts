import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { FeesService } from './fees.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('fees')
@UseGuards(JwtAuthGuard)
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  // Fee Types
  @Get('types')
  async getFeeTypes(@Request() req: any) {
    return this.feesService.getFeeTypes(req.user.schoolId);
  }

  @Post('types')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async createFeeType(@Request() req: any, @Body() body: any) {
    return this.feesService.createFeeType(req.user.schoolId, body);
  }

  // Invoices & Student Dues
  @Get('invoices')
  async getInvoices(
    @Request() req: any,
    @Query('classId') classId?: string,
    @Query('status') status?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.feesService.getInvoices(req.user.schoolId, classId, status, studentId);
  }

  @Post('invoices/generate')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async generateMonthlyInvoices(@Request() req: any, @Body() body: { feeTypeId: string; classId?: string; dueDate?: string }) {
    return this.feesService.generateInvoices(req.user.schoolId, body.feeTypeId, body.classId, body.dueDate);
  }

  // Payments / Collection
  @Post('payments')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async recordPayment(@Body() body: any) {
    return this.feesService.recordPayment(body);
  }

  // Expenses
  @Get('expenses')
  async getExpenses(@Request() req: any, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.feesService.getExpenses(req.user.schoolId, startDate, endDate);
  }

  @Post('expenses')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async createExpense(@Request() req: any, @Body() body: any) {
    return this.feesService.createExpense(req.user.schoolId, body);
  }

  // Payroll
  @Get('payroll')
  async getPayrolls(@Request() req: any, @Query('month') month?: string, @Query('year') year?: string) {
    return this.feesService.getPayrolls(req.user.schoolId, month, year ? Number(year) : undefined);
  }

  @Post('payroll')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async createPayroll(@Request() req: any, @Body() body: any) {
    return this.feesService.createPayroll(req.user.schoolId, body);
  }

  // Financial Summary
  @Get('summary')
  async getFinancialSummary(@Request() req: any, @Query('year') year?: string) {
    return this.feesService.getFinancialSummary(req.user.schoolId, year ? Number(year) : 2026);
  }
}
