import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PinoLogger } from 'nestjs-pino';
import { AccessTokenType } from 'src/common/decorator/access-type.decorator';
import { CurrentUser } from './decorator/user.decorator';
import { User } from './entity/user.entity';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
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

  @Post('friends')
  @AccessTokenType('access')
  postAddFriend(@CurrentUser() user: User, @Body('friendId') friendId: string) {}
}
