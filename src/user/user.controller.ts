import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PinoLogger } from 'nestjs-pino';

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

  @Get()
  getUser(@Body('email') email: string) {
    return this.userService.getUserByEmail(email);
  }
}
