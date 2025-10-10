import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UserService } from 'src/user/user.service';
import { Reflector } from '@nestjs/core';
import { ACCESS_TYPE_KEY, AccessTypeValue } from 'src/common/decorator/access-type.decorator';

@Injectable()
export class GlobalTokenGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredType =
      this.reflector.getAllAndOverride<AccessTypeValue>(ACCESS_TYPE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'access';

    const req = context.switchToHttp().getRequest();

    if (requiredType === 'public') {
      return true;
    }

    const token = requiredType === 'access' ? req.cookies?.accessToken : req.cookies?.refreshToken;
    const payload = this.authService.verifyToken(token);

    if (payload.type !== requiredType) {
      throw new UnauthorizedException(`Expected ${requiredType}`);
    }

    const user = await this.userService.getUserByEmail(payload.email);

    req.token = token;
    req.tokenType = payload.type;
    req.user = user;

    return true;
  }
}
