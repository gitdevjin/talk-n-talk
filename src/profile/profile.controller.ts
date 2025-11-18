import { Body, Controller, Patch } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from 'src/user/decorator/user.decorator';
import { User } from 'src/user/entity/user.entity';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch('edit')
  updateUserProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(user, dto);
  }
}
