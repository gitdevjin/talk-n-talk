import { Body, Controller, Headers, Post, Res, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { TxQueryRunner } from 'src/common/decorator/query-runner.decorator';
import { QueryRunner } from 'typeorm';
import { Response } from 'express';
import { AccessTokenType } from 'src/common/decorator/access-type.decorator';
import * as ms from 'ms';
import { CurrentUser } from 'src/user/decorator/user.decorator';
import { User } from 'src/user/entity/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/email')
  @AccessTokenType('public')
  async postLoginWithEmail(
    @Res({ passthrough: true }) res: Response,
    @Headers('authorization') authHeader: string
  ) {
    const base64String = this.authService.extractTokenFromHeader(authHeader);

    const credentials = this.authService.decodeBasicToken(base64String);

    const { accessToken, refreshToken, cookieOptions } =
      await this.authService.loginWithEmail(credentials);

    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: ms('1m'),
    });

    return { accessToken };
  }

  @Post('register/email')
  @AccessTokenType('public')
  @UseInterceptors(TransactionInterceptor)
  postRegisterWithEmail(@Body() body: CreateUserDto, @TxQueryRunner() qr: QueryRunner) {
    return this.authService.registerWithEmail(body, qr);
  }

  @Post('refresh')
  @AccessTokenType('refresh')
  async postRefreshToken(@Res({ passthrough: true }) res: Response, @CurrentUser() user: User) {
    const { accessToken, refreshToken, cookieOptions } = await this.authService.refreshTokens(user);

    res.cookie('refreshToken', refreshToken, cookieOptions);
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: ms('1m'),
    });

    return { accessToken };
  }
}
