import { Controller, Post, Get, Body, UseGuards, Req, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard, CurrentUser } from './auth.guard';
import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  email?: string;
}

class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

class SocialLoginDto {
  // Google: auth code from GSI popup
  @IsString()
  @IsOptional()
  code?: string;

  // Microsoft: ID token from MSAL popup
  @IsString()
  @IsOptional()
  idToken?: string;

  @IsString()
  @IsNotEmpty()
  provider: 'google' | 'microsoft';

  @IsString()
  @IsOptional()
  deviceInfo?: string;
}

class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

class UpdateUsernameDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  newUsername: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.username, dto.password, dto.email);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Body('deviceInfo') deviceInfo?: string,
  ) {
    const info = deviceInfo || userAgent || 'Unknown Device';
    return this.authService.login(dto.username, dto.password, info);
  }

  @Post('social-login')
  async socialLogin(
    @Body() dto: SocialLoginDto,
    @Headers('user-agent') userAgent: string,
  ) {
    const info = dto.deviceInfo || userAgent || 'Social Auth';
    return this.authService.socialLogin(
      { code: dto.code, idToken: dto.idToken },
      dto.provider,
      info,
    );
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@Req() req: any) {
    const token = req.token;
    return this.authService.logout(token);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@CurrentUser() user: any) {
    return user;
  }

  @UseGuards(AuthGuard)
  @Post('update-password')
  async updatePassword(@CurrentUser() user: any, @Body() dto: UpdatePasswordDto) {
    return this.authService.updatePassword(user.id, dto.oldPassword, dto.newPassword);
  }

  @UseGuards(AuthGuard)
  @Post('update-username')
  async updateUsername(@CurrentUser() user: any, @Body() dto: UpdateUsernameDto) {
    return this.authService.updateUsername(user.id, dto.newUsername);
  }

  @UseGuards(AuthGuard)
  @Get('sessions')
  async getSessions(@CurrentUser() user: any) {
    return this.authService.getSessions(user.id);
  }
}
