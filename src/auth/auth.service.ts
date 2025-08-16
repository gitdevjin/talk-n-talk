import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtConfig } from 'src/config/jwt.config';
import { User } from 'src/user/entity/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  extractTokenFromHeader(authHeader: string, expectedScheme: 'bearer' | 'basic') {
    const splitAuthHeader = authHeader.split(' ');

    if (splitAuthHeader.length !== 2) {
      throw new BadRequestException('Invalid Authorization header format');
    }

    const [scheme, token] = splitAuthHeader;

    if (scheme.toLowerCase()! == expectedScheme) {
      throw new BadRequestException('Invalid authentication scheme');
    }

    return token;
  }

  /**
   * Signs a JWT for a user.
   *
   * @param user - The user object containing at least email and id
   * @param tokenType - Either 'access' or 'refresh' to determine token type
   * @returns A signed JWT string
   */
  signToken(user: Pick<User, 'email' | 'id'>, tokenType: 'access' | 'refresh') {
    const jwtConfig: JwtConfig = this.configService.get<JwtConfig>('jwt');
    const { secret, accessTokenTtl, refreshTokenTtl } = jwtConfig;

    const payload = {
      email: user.email,
      sub: user.id,
      type: tokenType,
    };

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: tokenType === 'access' ? accessTokenTtl : refreshTokenTtl,
    });
  }

  generateTokens(user: Pick<User, 'email' | 'id'>) {
    return {
      accessToken: this.signToken(user, 'access'),
      refreshToken: this.signToken(user, 'refresh'),
    };
  }

  /**
   * Authenticates a user by email and password.
   *
   * @param user - An object containing the user's email and password
   * @returns The authenticated user object if credentials are valid
   * @throws UnauthorizedException if the user does not exist or password is invalid
   */
  authenticateUser();
}
