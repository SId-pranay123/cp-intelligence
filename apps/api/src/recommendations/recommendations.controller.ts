import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecommendationsService } from './recommendations.service';
import { ConfidenceDto } from './dto/confidence.dto';
import { User } from '../../generated/prisma/client';

interface AuthRequest extends Request {
  user: User;
}

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get()
  getRecommendations(@Request() req: AuthRequest) {
    return this.recommendations.getRecommendations(req.user.id);
  }

  @Get('skill-profile')
  getSkillProfile(@Request() req: AuthRequest) {
    return this.recommendations.getSkillProfile(req.user.id);
  }

  @Post('confidence')
  @HttpCode(HttpStatus.OK)
  updateConfidence(
    @Request() req: AuthRequest,
    @Body() dto: ConfidenceDto,
  ): Promise<{ success: boolean }> {
    return this.recommendations.updateConfidence(
      req.user.id,
      dto.conceptId,
      dto.confidenceRating,
    );
  }
}
