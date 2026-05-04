import { IsString, IsInt, Min, Max } from 'class-validator';

export class ConfidenceDto {
  @IsString()
  conceptId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  confidenceRating!: number;
}
