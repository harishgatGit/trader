import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class ClientLogDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['error', 'warn', 'info'])
  level: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  stack?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  timestamp?: string;
}
