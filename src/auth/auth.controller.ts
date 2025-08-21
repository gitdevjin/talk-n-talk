import { Body, Controller, Headers, Post, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';

import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { TxQueryRunner } from 'src/common/decorator/query-runner.decorator';
import { QueryRunner } from 'typeorm';

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
  @UseInterceptors(TransactionInterceptor)
  postRegisterWithEmail(@Body() body: CreateUserDto, @TxQueryRunner() qr: QueryRunner) {
    return this.authService.registerWithEmail(body, qr);
  }
}
