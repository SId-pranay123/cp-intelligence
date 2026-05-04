import { Injectable } from '@nestjs/common';
import { ProcessorService, RecommendationResponse } from '../processor/processor.service';
import { RedisService } from '../redis/redis.service';

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

  async updateConfidence(
    userId: string,
    conceptId: string,
    rating: number,
  ): Promise<{ success: boolean }> {
    const result = await this.processor.callUpdateConfidence(userId, conceptId, rating);
    if (result.success) {
      await this.redis.del(cacheKey(userId));
    }
    return result;
  }
}
