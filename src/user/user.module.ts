import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { ProfileModule } from 'src/profile/profile.module';
import { Friendship } from './entity/friendship.entity';
import { FriendshipService } from './friendship.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Friendship]), ProfileModule],
  controllers: [UserController],
  providers: [UserService, FriendshipService],
  exports: [UserService, FriendshipService],
})
export class UserModule {}
