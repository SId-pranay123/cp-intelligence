import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TargetsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.userCompanyTarget.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(userId: string, companyName: string, tags: string[]) {
    return this.prisma.userCompanyTarget.create({
      data: { userId, companyName, tags },
    });
  }

  async remove(userId: string, id: string) {
    await this.prisma.userCompanyTarget.deleteMany({ where: { id, userId } });
    return { ok: true };
  }
}
