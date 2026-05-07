import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TargetsService } from './targets.service';
import { User } from '../../generated/prisma/client';

interface AuthRequest extends Request {
  user: User;
}

@Controller('targets')
@UseGuards(JwtAuthGuard)
export class TargetsController {
  constructor(private readonly targets: TargetsService) {}

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.targets.findAll(req.user.id);
  }

  @Post()
  create(
    @Request() req: AuthRequest,
    @Body() body: { companyName: string; tags: string[] },
  ) {
    return this.targets.create(req.user.id, body.companyName, body.tags ?? []);
  }

  @Delete(':id')
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.targets.remove(req.user.id, id);
  }
}
