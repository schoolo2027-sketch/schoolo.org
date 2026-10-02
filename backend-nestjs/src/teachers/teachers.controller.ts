import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('teachers')
@UseGuards(JwtAuthGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.teachersService.findAllBySchool(req.user.schoolId);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.teachersService.findOne(req.user.schoolId, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async create(@Request() req: any, @Body() body: any) {
    return this.teachersService.create(req.user.schoolId, body);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.teachersService.update(req.user.schoolId, id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.teachersService.remove(req.user.schoolId, id);
  }

  @Post(':id/assign-class')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async assignClass(@Request() req: any, @Param('id') teacherId: string, @Body() body: any) {
    return this.teachersService.assignClass(req.user.schoolId, teacherId, body);
  }

  @Post(':id/assign-subject')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async assignSubject(@Request() req: any, @Param('id') teacherId: string, @Body() body: any) {
    return this.teachersService.assignSubject(teacherId, body.subjectId);
  }
}
