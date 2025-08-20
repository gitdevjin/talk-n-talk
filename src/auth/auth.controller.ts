import { Body, Controller, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

import { CreateUserDto } from 'src/user/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/email')
  postLoginWithEmail(@Headers('authorization') authHeaer: string) {
    const base64String = this.authService.extractTokenFromHeader(authHeaer, 'basic');

    const credentials = this.authService.decodeBasicToken(base64String);

    return this.authService.loginWithEmail(credentials);
  }

  @Post('register/email')
  postRegisterWithEmail(@Body() body: CreateUserDto) {
    return this.authService.registerWithEmail(body);
  }
}
