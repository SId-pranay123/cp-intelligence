import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { CodeforcesSubmission } from '../../generated/prisma/client';

// ── Proto-loaded types ────────────────────────────────────────────────────────
// We use dynamic loading (proto-loader) so NestJS doesn't need a separate
// code-gen step — the proto file is the single source of truth.

type GrpcCallback<T> = (err: grpc.ServiceError | null, res: T) => void;

interface SkillProfile {
  userId: string;
  concepts: unknown[];
}

export interface RecommendedProblem {
  id: string;
  title: string;
  link: string;
  difficulty: string;
  source: string;
}

export interface Recommendation {
  problem: RecommendedProblem;
  conceptName: string;
  reason: string;
}

export interface RecommendationResponse {
  userId: string;
  recommendations: Recommendation[];
}

// Field names match the proto file exactly (keepCase: true).
interface SubmissionBatch {
  user_id: string;
  submissions: Array<{
    problem_id: string;
    problem_name: string;
    tags: string[];
    verdict: string;
    language: string;
    submitted_at: number;
    time_taken_ms: number;
    memory_used: number;
    problem_rating: number;
  }>;
}

interface ProcessorClient {
  ProcessSubmissions(batch: SubmissionBatch, cb: GrpcCallback<SkillProfile>): void;
  GetRecommendations(req: { user_id: string }, cb: GrpcCallback<RecommendationResponse>): void;
  UpdateConfidence(req: { user_id: string; concept_id: string; rating: number }, cb: GrpcCallback<{ success: boolean }>): void;
  GetSkillProfile(req: { user_id: string }, cb: GrpcCallback<SkillProfile>): void;
  close(): void;
}

const PROTO_PATH = path.resolve(
  __dirname,
  '../../../../../packages/proto/data_processing.proto',
);

@Injectable()
export class ProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProcessorService.name);
  private client: ProcessorClient | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.getOrThrow<string>('GO_SERVICE_URL');

    const packageDef = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const proto = grpc.loadPackageDefinition(packageDef) as Record<
      string,
      Record<string, new (...args: unknown[]) => unknown>
    >;

    const ServiceCtor = proto['dataprocessing'][
      'DataProcessingService'
    ] as new (
      address: string,
      credentials: grpc.ChannelCredentials,
    ) => ProcessorClient;

    this.client = new ServiceCtor(url, grpc.credentials.createInsecure());
    this.logger.log(`gRPC client connected → ${url}`);
  }

  onModuleDestroy(): void {
    this.client?.close();
  }

  // ── Public methods called by other services ───────────────────────────────

  // NOTE: keepCase:true means field names must match the proto file exactly (snake_case).
  callProcessSubmissions(
    userId: string,
    submissions: CodeforcesSubmission[],
  ): Promise<SkillProfile> {
    return this.call((cb) =>
      this.client!.ProcessSubmissions(
        {
          user_id: userId,
          submissions: submissions.map((s) => ({
            problem_id: s.problemId,
            problem_name: s.problemName,
            tags: s.problemTags,
            verdict: s.verdict,
            language: s.language,
            submitted_at: Math.floor(s.submittedAt.getTime() / 1000),
            time_taken_ms: s.timeTakenMs ?? 0,
            memory_used: s.memoryUsed ?? 0,
            problem_rating: 0,
          })),
        },
        cb,
      ),
    30_000,
    );
  }

  callGetRecommendations(userId: string): Promise<RecommendationResponse> {
    return this.call((cb) =>
      this.client!.GetRecommendations({ user_id: userId }, cb),
    20_000,
    );
  }

  callUpdateConfidence(
    userId: string,
    conceptId: string,
    rating: number,
  ): Promise<{ success: boolean }> {
    return this.call((cb) =>
      this.client!.UpdateConfidence({ user_id: userId, concept_id: conceptId, rating }, cb),
    );
  }

  callGetSkillProfile(userId: string): Promise<SkillProfile> {
    return this.call((cb) =>
      this.client!.GetSkillProfile({ user_id: userId }, cb),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private call<T>(
    fn: (cb: GrpcCallback<T>) => void,
    timeoutMs = 7000,
  ): Promise<T> {
    if (!this.client) {
      return Promise.reject(new Error('gRPC client not initialised'));
    }
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`gRPC call timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
      fn((err, res) => {
        clearTimeout(timer);
        if (err) return reject(err);
        resolve(res);
      });
    });
  }
}
