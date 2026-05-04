import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class SetHandleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(24)
  @Matches(/^[a-zA-Z0-9_.\-]+$/, {
    message: 'handle can only contain letters, numbers, underscores, hyphens, and dots',
  })
  handle: string;
}
