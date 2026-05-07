import { Injectable } from '@nestjs/common';
import { ProcessorService, RecommendationResponse } from '../processor/processor.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

export interface SkillProfileResponse {
  user_id: string;
  concepts: Array<{
    concept_id: string;
    concept_name: string;
    strength: number;
    last_practiced: string;
  }>;
}

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const cacheKey = (userId: string) => `recommendations:${userId}`;

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly processor: ProcessorService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async getRecommendations(userId: string): Promise<RecommendationResponse> {
    const key = cacheKey(userId);

    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached) as RecommendationResponse;
    }

    const result = await this.processor.callGetRecommendations(userId);
    await this.redis.set(key, JSON.stringify(result), CACHE_TTL_SECONDS);
    return result;
  }

  getSkillProfile(userId: string): Promise<SkillProfileResponse> {
    return this.processor.callGetSkillProfile(userId) as unknown as Promise<SkillProfileResponse>;
  }

  async getConceptProblems(userId: string, conceptId: string) {
    const problems = await this.prisma.problem.findMany({
      where: { conceptIds: { has: conceptId } },
      include: { activities: { where: { userId } } },
    });

    const diffOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2, expert: 3 };

    const mapped = problems.map((p) => {
      const activity = p.activities[0] ?? null;
      return {
        id: p.id,
        title: p.title,
        difficulty: p.difficulty ?? 'unknown',
        link: p.link,
        source: p.source,
        solved: activity?.solvedAt != null,
        confidenceRating: activity?.confidenceRating ?? null,
      };
    });

    mapped.sort((a, b) => {
      if (a.solved !== b.solved) return a.solved ? 1 : -1;
      if (!a.solved) return (diffOrder[a.difficulty] ?? 9) - (diffOrder[b.difficulty] ?? 9);
      return (b.confidenceRating ?? 0) - (a.confidenceRating ?? 0);
    });

    return { conceptId, problems: mapped };
  }

  async getReviewQueue(userId: string) {
    const now = new Date();

    const [due, upcoming] = await Promise.all([
      this.prisma.userProblemActivity.findMany({
        where: { userId, nextReviewAt: { lte: now }, solvedAt: { not: null } },
        include: { problem: true },
        orderBy: { nextReviewAt: 'asc' },
      }),
      this.prisma.userProblemActivity.findMany({
        where: { userId, nextReviewAt: { gt: now }, solvedAt: { not: null } },
        include: { problem: true },
        orderBy: { nextReviewAt: 'asc' },
        take: 20,
      }),
    ]);

    const mapProblem = (a: (typeof due)[0]) => ({
      problem: {
        id: a.problem.id,
        title: a.problem.title,
        link: a.problem.link,
        difficulty: a.problem.difficulty ?? 'unknown',
        source: a.problem.source,
      },
      concept_name: a.problem.conceptIds[0] ?? '',
      reason: `Last rated ${a.confidenceRating ?? '?'}/5 — due for review today`,
      last_confidence: a.confidenceRating,
    });

    return {
      reviews: due.map(mapProblem),
      upcoming: upcoming.map((a) => ({
        problem: {
          id: a.problem.id,
          title: a.problem.title,
          link: a.problem.link,
          difficulty: a.problem.difficulty ?? 'unknown',
        },
        last_confidence: a.confidenceRating,
        nextReviewAt: a.nextReviewAt,
      })),
    };
  }

  async updateConfidence(
    userId: string,
    conceptId: string,
    rating: number,
    problemId?: string,
  ): Promise<{ success: boolean }> {
    // Update Neo4j concept strength via processor
    const result = await this.processor.callUpdateConfidence(userId, conceptId, rating);

    // Schedule spaced-repetition review in Postgres
    if (problemId) {
      const BASE_DAYS = [0, 1, 2, 4, 8, 16];
      const existing = await this.prisma.userProblemActivity.findUnique({
        where: { userId_problemId: { userId, problemId } },
      });
      const reviewCount = existing?.reviewCount ?? 0;
      const days = (BASE_DAYS[rating] ?? 4) * Math.pow(2, reviewCount);
      const nextReviewAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      await this.prisma.userProblemActivity.upsert({
        where: { userId_problemId: { userId, problemId } },
        update: {
          confidenceRating: rating,
          solvedAt: existing?.solvedAt ?? new Date(),
          nextReviewAt,
          reviewCount: { increment: 1 },
        },
        create: {
          userId,
          problemId,
          source: 'recommendation',
          solvedAt: new Date(),
          confidenceRating: rating,
          nextReviewAt,
          reviewCount: 1,
        },
      });
    }

    if (result.success) {
      await this.redis.del(cacheKey(userId));
    }
    return result;
  }
}
