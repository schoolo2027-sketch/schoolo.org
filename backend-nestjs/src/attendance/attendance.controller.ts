import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('students')
  async getStudentAttendance(
    @Request() req: any,
    @Query('classId') classId: string,
    @Query('date') date: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.attendanceService.getStudentAttendance(req.user.schoolId, classId, date, sectionId);
  }

  @Post('students/bulk')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN')
  async saveStudentAttendanceBulk(@Request() req: any, @Body() body: any) {
    return this.attendanceService.saveStudentAttendanceBulk(body.date, body.records);
  }

  @Get('students/summary')
  async getStudentSummary(
    @Request() req: any,
    @Query('classId') classId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.attendanceService.getStudentAttendanceSummary(req.user.schoolId, classId, Number(month), Number(year));
  }

  @Get('teachers')
  async getTeacherAttendance(@Request() req: any, @Query('date') date: string) {
    return this.attendanceService.getTeacherAttendance(req.user.schoolId, date);
  }

  @Post('teachers/bulk')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async saveTeacherAttendanceBulk(@Request() req: any, @Body() body: any) {
    return this.attendanceService.saveTeacherAttendanceBulk(req.user.schoolId, body.date, body.records);
  }
}
