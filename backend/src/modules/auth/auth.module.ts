import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { RoleGuard } from './role.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RoleGuard],
  exports: [AuthService, AuthGuard, RoleGuard],
})
export class AuthModule {}
