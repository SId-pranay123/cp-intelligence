import {
  Controller,
  Get,
  Post,
  Body,
  Query,
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

  @Get('concept-problems')
  getConceptProblems(
    @Request() req: AuthRequest,
    @Query('conceptId') conceptId: string,
  ) {
    return this.recommendations.getConceptProblems(req.user.id, conceptId);
  }

  @Get('review-queue')
  getReviewQueue(@Request() req: AuthRequest) {
    return this.recommendations.getReviewQueue(req.user.id);
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
      dto.problemId,
    );
  }
}
