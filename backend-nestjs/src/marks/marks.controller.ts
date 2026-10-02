import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { MarksService } from './marks.service';
import { SaveMarkDto } from './dto/save-mark.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Marks & Results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/marks')
export class MarksController {
  constructor(private readonly marksService: MarksService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Save/Update student subject marks (CQ/MCQ/Prac)' })
  saveMark(@Body() dto: SaveMarkDto) {
    return this.marksService.saveMark(dto);
  }

  @Get('marksheet/:examId/:studentId')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
  @ApiOperation({ summary: 'Generate calculated marksheet with 4th subject rule' })
  getMarksheet(@Param('examId') examId: string, @Param('studentId') studentId: string) {
    return this.marksService.getStudentMarksheet(examId, studentId);
  }
}
