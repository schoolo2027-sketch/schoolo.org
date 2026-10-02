import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Enroll a new student' })
  create(@Req() req: any, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(req.user.schoolId, dto);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get all students with filter' })
  findAll(
    @Req() req: any,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.studentsService.findAllBySchool(req.user.schoolId, classId, sectionId);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT')
  @ApiOperation({ summary: 'Get student profile & academic details' })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.studentsService.findOne(req.user.schoolId, id);
  }
}
