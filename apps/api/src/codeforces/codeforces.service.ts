import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessorService } from '../processor/processor.service';
import { RedisService } from '../redis/redis.service';
import { User } from '../../generated/prisma/client';
import {
  CfApiResponse,
  CfSubmission,
  CfUser,
} from './codeforces-api.types';
import { mapTagsToConceptIds, ratingToDifficulty } from './cf-tag-map';

const CF_BASE = 'https://codeforces.com/api';
// Codeforces asks callers to stay under 1 req/s; we hit it once per sync so
// this timeout is just a safety net for slow responses.
const CF_TIMEOUT_MS = 15_000;

@Injectable()
export class CodeforcesService {
  private readonly logger = new Logger(CodeforcesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: ProcessorService,
    private readonly redis: RedisService,
  ) {}

  // ── Handle management ──────────────────────────────────────────────────────

  async setHandle(user: User, handle: string): Promise<{ handle: string }> {
    await this.validateHandleExists(handle);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { codeforcesHandle: handle },
    });

    return { handle };
  }

  // ── Sync ───────────────────────────────────────────────────────────────────

  async sync(user: User): Promise<{ synced: number }> {
    if (!user.codeforcesHandle) {
      throw new BadRequestException(
        'No Codeforces handle set. Call PUT /codeforces/handle first.',
      );
    }

    const submissions = await this.fetchSubmissions(user.codeforcesHandle);

    // Upsert problems first (synchronous — needed before ProcessSubmissions)
    await this.upsertProblems(submissions);

    const synced = await this.upsertSubmissions(user.id, submissions);

    this.logger.log(
      `Synced ${synced} submissions for user ${user.id} (handle: ${user.codeforcesHandle})`,
    );

    // Invalidate the recommendations cache so the next GET reflects new scores.
    await this.redis.del(`recommendations:${user.id}`);

    // Fire-and-forget: score the full submission history in the Go service.
    this.prisma.codeforcesSubmission
      .findMany({ where: { userId: user.id } })
      .then((stored) =>
        this.processor.callProcessSubmissions(user.id, stored),
      )
      .catch((err) =>
        this.logger.warn(`ProcessSubmissions failed for user ${user.id}: ${err}`),
      );

    return { synced };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async validateHandleExists(handle: string): Promise<void> {
    try {
      const res = await axios.get<CfApiResponse<CfUser[]>>(
        `${CF_BASE}/user.info?handles=${encodeURIComponent(handle)}`,
        { timeout: CF_TIMEOUT_MS },
      );

      if (res.data.status === 'FAILED') {
        throw new NotFoundException(
          `Codeforces handle "${handle}" does not exist.`,
        );
      }
    } catch (err) {
      if (err instanceof NotFoundException) throw err;

      // CF returns HTTP 400 with status:"FAILED" for unknown handles
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        const body = err.response.data as CfApiResponse<unknown>;
        if (body?.status === 'FAILED') {
          throw new NotFoundException(
            `Codeforces handle "${handle}" does not exist.`,
          );
        }
      }

      this.handleAxiosError(err, `validating handle "${handle}"`);
    }
  }

  private async fetchSubmissions(handle: string): Promise<CfSubmission[]> {
    try {
      const res = await axios.get<CfApiResponse<CfSubmission[]>>(
        `${CF_BASE}/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`,
        { timeout: CF_TIMEOUT_MS },
      );

      if (res.data.status === 'FAILED') {
        throw new BadRequestException(
          `Codeforces API error: ${res.data.comment ?? 'unknown error'}`,
        );
      }

      return res.data.result ?? [];
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.handleAxiosError(err, `fetching submissions for "${handle}"`);
    }
  }

  private async upsertSubmissions(
    userId: string,
    submissions: CfSubmission[],
  ): Promise<number> {
    // Prisma v7 doesn't support createMany + skipDuplicates with the WASM
    // driver yet, so we batch upserts in chunks to stay within query limits.
    const CHUNK = 200;
    let total = 0;

    for (let i = 0; i < submissions.length; i += CHUNK) {
      const chunk = submissions.slice(i, i + CHUNK);

      await Promise.all(
        chunk.map((s) => {
          const problemId = this.buildProblemId(s);
          return this.prisma.codeforcesSubmission.upsert({
            where: {
              userId_problemId_submissionId: {
                userId,
                problemId,
                submissionId: String(s.id),
              },
            },
            create: {
              userId,
              submissionId: String(s.id),
              problemId,
              problemName: s.problem.name,
              problemTags: s.problem.tags,
              verdict: s.verdict ?? 'UNKNOWN',
              language: s.programmingLanguage,
              submittedAt: new Date(s.creationTimeSeconds * 1000),
              timeTakenMs: s.timeConsumedMillis,
              memoryUsed: Math.round(s.memoryConsumedBytes / 1024),
            },
            update: {
              verdict: s.verdict ?? 'UNKNOWN',
            },
          });
        }),
      );

      total += chunk.length;
    }

    return total;
  }

  private buildProblemId(s: CfSubmission): string {
    if (s.problem.contestId) {
      return `${s.problem.contestId}${s.problem.index}`;
    }
    if (s.problem.problemsetName) {
      return `${s.problem.problemsetName}-${s.problem.index}`;
    }
    return `gym-${s.problem.index}`;
  }

  private async upsertProblems(submissions: CfSubmission[]): Promise<void> {
    // Deduplicate: one record per unique external_id (one problem, many submissions)
    const byId = new Map<string, CfSubmission>();
    for (const s of submissions) {
      const id = this.buildProblemId(s);
      if (!byId.has(id)) byId.set(id, s);
    }

    const CHUNK = 100;
    const entries = [...byId.entries()];

    for (let i = 0; i < entries.length; i += CHUNK) {
      const chunk = entries.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map(([externalId, s]) =>
          this.prisma.problem.upsert({
            where: { source_externalId: { source: 'codeforces', externalId } },
            create: {
              source: 'codeforces',
              externalId,
              title: s.problem.name,
              difficulty: ratingToDifficulty(s.problem.rating),
              link: this.buildProblemLink(s),
              conceptIds: mapTagsToConceptIds(s.problem.tags),
            },
            update: {
              // Update difficulty/concepts if rating improved over time
              difficulty: ratingToDifficulty(s.problem.rating),
              conceptIds: mapTagsToConceptIds(s.problem.tags),
            },
          }),
        ),
      );
    }

    this.logger.log(`Upserted ${byId.size} problems`);
  }

  private buildProblemLink(s: CfSubmission): string {
    if (s.problem.contestId) {
      return `https://codeforces.com/problemset/problem/${s.problem.contestId}/${s.problem.index}`;
    }
    if (s.problem.problemsetName) {
      return `https://codeforces.com/problemsets/${s.problem.problemsetName}/problem/${s.problem.index}`;
    }
    return `https://codeforces.com/gym/problem/${s.problem.index}`;
  }

  private handleAxiosError(err: unknown, context: string): never {
    if (axios.isAxiosError(err)) {
      const axErr = err as AxiosError;
      if (axErr.code === 'ECONNABORTED') {
        throw new ServiceUnavailableException(
          `Codeforces API timed out while ${context}.`,
        );
      }
      if (axErr.response?.status === 429) {
        throw new ServiceUnavailableException(
          'Codeforces API rate limit hit. Please try again in a moment.',
        );
      }
      if (axErr.response?.status === 503 || axErr.response?.status === 502) {
        throw new ServiceUnavailableException(
          'Codeforces API is temporarily unavailable.',
        );
      }
    }
    this.logger.error(`Unexpected error while ${context}`, err);
    throw new ServiceUnavailableException(
      `Failed to contact Codeforces API while ${context}.`,
    );
  }
}
