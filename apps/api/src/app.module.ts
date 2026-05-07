import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CodeforcesModule } from './codeforces/codeforces.module';
import { ProcessorModule } from './processor/processor.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { RedisModule } from './redis/redis.module';
import { TargetsModule } from './targets/targets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    CodeforcesModule,
    ProcessorModule,
    RecommendationsModule,
    TargetsModule,
  ],
})
export class AppModule {}
