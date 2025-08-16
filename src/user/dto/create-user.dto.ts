import { PickType } from '@nestjs/mapped-types';
import { User } from '../entity/user.entity';
import { IsEmail, IsString, Length } from 'class-validator';

export class CreateUserDto extends PickType(User, ['email', 'password', 'username']) {
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 20)
  password: string;

  @IsString()
  @Length(6, 20)
  username: string;
}
