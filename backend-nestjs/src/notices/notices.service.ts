import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NoticesService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string, targetRole?: string) {
    const where: any = { schoolId };
    if (targetRole && targetRole !== 'ALL') {
      where.OR = [{ targetRole: 'ALL' }, { targetRole }];
    }
    return this.prisma.notice.findMany({
      where,
      orderBy: { publishDate: 'desc' },
    });
  }

  async create(schoolId: string, data: { title: string; content: string; targetRole?: string }) {
    return this.prisma.notice.create({
      data: {
        schoolId,
        title: data.title,
        content: data.content,
        targetRole: data.targetRole || 'ALL',
      },
    });
  }

  async remove(schoolId: string, id: string) {
    const notice = await this.prisma.notice.findFirst({
      where: { id, schoolId },
    });
    if (!notice) {
      throw new NotFoundException('Notice not found');
    }
    return this.prisma.notice.delete({
      where: { id },
    });
  }
}
