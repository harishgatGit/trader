import { IsString, MinLength, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsIn(['BASIC', 'SUPERUSER'])
  role: string;
}
