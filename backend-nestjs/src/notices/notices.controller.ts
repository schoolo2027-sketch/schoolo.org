import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NoticesService } from './notices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('notices')
@UseGuards(JwtAuthGuard)
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Get()
  async getNotices(@Request() req: any, @Query('targetRole') targetRole?: string) {
    return this.noticesService.findAll(req.user.schoolId, targetRole);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async createNotice(@Request() req: any, @Body() body: any) {
    return this.noticesService.create(req.user.schoolId, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  async removeNotice(@Request() req: any, @Param('id') id: string) {
    return this.noticesService.remove(req.user.schoolId, id);
  }
}
