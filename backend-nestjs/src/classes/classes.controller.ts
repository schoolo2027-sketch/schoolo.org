import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('classes')
@UseGuards(JwtAuthGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.classesService.findAll(req.user.schoolId);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.classesService.findOne(req.user.schoolId, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async createClass(@Request() req: any, @Body() body: any) {
    return this.classesService.createClass(req.user.schoolId, body);
  }

  @Post(':id/sections')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async createSection(@Param('id') classId: string, @Body() body: any) {
    return this.classesService.createSection(classId, body);
  }

  @Get(':id/subjects')
  async getSubjects(@Request() req: any, @Param('id') classId: string) {
    return this.classesService.getSubjects(req.user.schoolId, classId);
  }

  @Post(':id/subjects')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async createSubject(@Request() req: any, @Param('id') classId: string, @Body() body: any) {
    return this.classesService.createSubject(req.user.schoolId, classId, body);
  }

  @Delete('subjects/:subjectId')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async removeSubject(@Param('subjectId') subjectId: string) {
    return this.classesService.removeSubject(subjectId);
  }
}
