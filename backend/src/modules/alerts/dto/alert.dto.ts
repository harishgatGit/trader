import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEmail, IsIn } from 'class-validator';

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsIn(['price_above','price_below','rsi_above','rsi_below','macd_bullish','macd_bearish','signal_buy','signal_sell','accumulation_zone','stop_loss_hit','target_hit'])
  type: string;

  @IsNumber()
  @IsOptional()
  value?: number;

  @IsBoolean()
  @IsOptional()
  notifyEmail?: boolean;

  @IsEmail()
  @IsOptional()
  emailAddress?: string;

  @IsBoolean()
  @IsOptional()
  notifyInApp?: boolean;
}

export class UpdateAlertDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyEmail?: boolean;

  @IsEmail()
  @IsOptional()
  emailAddress?: string;

  @IsString()
  @IsOptional()
  name?: string;
}
