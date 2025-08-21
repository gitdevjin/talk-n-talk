import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtConfig } from 'src/config/jwt.config';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User } from 'src/user/entity/user.entity';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { AuthConfig } from 'src/config/auth.config';
import { QueryRunner } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  extractTokenFromHeader(authHeader: string, expectedScheme: 'bearer' | 'basic') {
    const splitAuthHeader = authHeader.split(' ');

    if (splitAuthHeader.length !== 2) {
      throw new BadRequestException('Invalid Authorization header format');
    }

    const [scheme, token] = splitAuthHeader;

    if (scheme.toLowerCase() !== expectedScheme) {
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
  private async authenticateUser(user: Pick<User, 'email' | 'password'>) {
    const userRecord = await this.userService.getUserByEmail(user.email);

    if (!userRecord) {
      throw new UnauthorizedException('Invalid Email');
    }

    const isPasswordValid = await bcrypt.compare(user.password, userRecord.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    return userRecord;
  }

  async registerWithEmail(user: CreateUserDto, qr?: QueryRunner) {
    const hash = await bcrypt.hash(
      user.password,
      this.configService.get<AuthConfig>('auth').hashRounds
    );

    const newUser = await this.userService.createUser(
      {
        ...user,
        password: hash,
      },
      qr
    );

    const tokens = this.generateTokens(newUser);

    await this.userService.updateRefreshToken(newUser.id, tokens.refreshToken, qr);

    return tokens;
  }

  async loginWithEmail(user: Pick<User, 'email' | 'password'>) {
    const userRecord = await this.authenticateUser(user);

    const tokens = this.generateTokens(userRecord);

    await this.userService.updateRefreshToken(userRecord.id, tokens.refreshToken);

    return tokens;
  }

  decodeBasicToken(base64Credential: string) {
    const decodedCredential = Buffer.from(base64Credential, 'base64').toString('utf8');

    const separatorIdx = decodedCredential.indexOf(':');

    if (separatorIdx === -1) {
      throw new UnauthorizedException(
        'Invalid Basic authentication format. Expected "email:password".'
      );
    }

    const email = decodedCredential.slice(0, separatorIdx);
    const password = decodedCredential.slice(separatorIdx + 1);

    if (!email || !password) {
      throw new UnauthorizedException('Email or password cannot be empty in Basic authentication.');
    }

    return { email, password };
  }
}
