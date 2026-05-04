import {
  Controller,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CodeforcesService } from './codeforces.service';
import { SetHandleDto } from './dto/set-handle.dto';
import { User } from '../../generated/prisma/client';

interface AuthRequest extends Request {
  user: User;
}

@Controller('codeforces')
@UseGuards(JwtAuthGuard)
export class CodeforcesController {
  constructor(private readonly codeforces: CodeforcesService) {}

  @Put('handle')
  setHandle(
    @Request() req: AuthRequest,
    @Body() dto: SetHandleDto,
  ): Promise<{ handle: string }> {
    return this.codeforces.setHandle(req.user, dto.handle);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  sync(@Request() req: AuthRequest): Promise<{ synced: number }> {
    return this.codeforces.sync(req.user);
  }
}
