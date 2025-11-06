import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PinoLogger } from 'nestjs-pino';
import { AccessTokenType } from 'src/common/decorator/access-type.decorator';
import { CurrentUser } from './decorator/user.decorator';
import { User } from './entity/user.entity';
import { FriendshipService } from './friendship.service';
import { FriendshipStatus } from './entity/friendship.entity';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly friendshipService: FriendshipService,
    private readonly logger: PinoLogger
  ) {}

  @Post() // This is just for test
  postCreateUser(@Body() body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  @Get('me')
  @AccessTokenType('access')
  getUser(@CurrentUser() user: User) {
    return this.userService.getUserByEmail(user.email);
  }

  @Get('search')
  getSearchUsersForFriendship(@CurrentUser() user: User, @Query('username') username: string) {
    return this.friendshipService.searchUsersWithFriendStatus(user, username);
  }

  @Post('friends')
  postFriendRequest(@CurrentUser() user: User, @Body('friendId') friendId: string) {
    return this.friendshipService.createFriendship(user, friendId);
  }

  @Delete('friends/:friendId')
  deleteFriend(@CurrentUser() user: User, @Param('friendId') friendId: string) {
    return this.friendshipService.deleteFrined(user, friendId);
  }

  @Patch('friends/requests/:id')
  patchUpdateFriendRequest(
    @CurrentUser() user: User,
    @Param('id') friendshipId: string,
    @Body('status') status: FriendshipStatus
  ) {
    return this.friendshipService.updateFriendship(user, friendshipId, status);
  }

  @Delete('friends/requests/:id')
  deleteFriendRequest(@CurrentUser() user: User, @Param('id') friendshipId: string) {
    return this.friendshipService.deleteFriendshipRequest(user, friendshipId);
  }

  @Get('friends')
  getFriends(@CurrentUser() user: User) {
    return this.friendshipService.getAllFriends(user);
  }

  @Get('friends/requests/incoming')
  getIncomingFriendRquests(@CurrentUser() user: User) {
    return this.friendshipService.getIncomingFriendships(user);
  }

  @Get('friends/requests/outgoing')
  getOutgoingFriendRquests(@CurrentUser() user: User) {
    return this.friendshipService.getOutgoingFriendships(user);
  }
}
