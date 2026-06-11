import { IsString, IsNotEmpty, Length, Matches, IsOptional, IsBoolean } from 'class-validator';

export class AnalyzeDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  @Matches(/^[A-Z0-9.]+$/i, { message: 'Symbol must be alphanumeric' })
  symbol: string;

  @IsOptional()
  @IsBoolean()
  bypassCache?: boolean;
}
