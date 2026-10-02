import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrentSchool(@Request() req: any) {
    return this.schoolsService.getSchoolById(req.user.schoolId);
  }

  @Get(':id')
  async getSchool(@Param('id') id: string) {
    return this.schoolsService.getSchoolById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  async createSchool(@Body() data: any) {
    return this.schoolsService.createSchool(data);
  }

  @Put('current')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async updateCurrentSchool(@Request() req: any, @Body() data: any) {
    return this.schoolsService.updateSchool(req.user.schoolId, data);
  }

  @Get('current/stats')
  @UseGuards(JwtAuthGuard)
  async getSchoolStats(@Request() req: any) {
    return this.schoolsService.getStats(req.user.schoolId);
  }

  @Get('current/settings')
  @UseGuards(JwtAuthGuard)
  async getSchoolSettings(@Request() req: any) {
    return this.schoolsService.getSettings(req.user.schoolId);
  }

  @Post('current/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async saveSchoolSetting(@Request() req: any, @Body() body: { key: string; value: string }) {
    return this.schoolsService.saveSetting(req.user.schoolId, body.key, body.value);
  }
}
