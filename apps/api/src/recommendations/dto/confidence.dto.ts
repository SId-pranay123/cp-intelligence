import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class ConfidenceDto {
  @IsString()
  conceptId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  confidenceRating!: number;

  @IsString()
  @IsOptional()
  problemId?: string;
}
