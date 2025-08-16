import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PinoLogger } from 'nestjs-pino';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: PinoLogger
  ) {}

  @Post()
  postCreateUser(@Body() body: CreateUserDto) {
    this.logger.info(`Creating a new user[${body.username}] in ${UserController.name}`);
    return this.userService.createUser(body);
  }
}
