import { PickType } from '@nestjs/mapped-types';
import { Profile } from '../entity/profile.entity';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto extends PickType(Profile, ['name', 'bio']) {
  @IsString()
  @Length(3, 20)
  name: string;

  @IsString()
  @IsOptional()
  bio?: string;
}
