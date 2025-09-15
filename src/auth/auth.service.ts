import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';
import { JwtConfig } from 'src/config/jwt.config';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User } from 'src/user/entity/user.entity';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { AuthConfig } from 'src/config/auth.config';
import { QueryRunner } from 'typeorm';
import * as ms from 'ms';
import { CookieOptions } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  type: string;
  iat?: number; // issued at (auto-added by JWT)
  exp?: number; // expiration (auto-added by JWT)
  nbf?: number; // not before (optional)
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  extractTokenFromHeader(authHeader: string) {
    const splitAuthHeader = authHeader.split(' ');

    if (splitAuthHeader.length !== 2) {
      throw new BadRequestException('Invalid Authorization header format');
    }

    const [scheme, token] = splitAuthHeader;

    if (scheme.toLowerCase() !== 'basic') {
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
  private signToken(user: Pick<User, 'email' | 'id'>, tokenType: 'access' | 'refresh') {
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

  /**
   * Generates a pair of JWT access and refresh tokens for a user.
   *
   * @param user - The user object containing at least email and id
   * @returns An object containing accessToken and refreshToken strings
   */
  private generateTokens(user: Pick<User, 'email' | 'id'>) {
    return {
      accessToken: this.signToken(user, 'access'),
      refreshToken: this.signToken(user, 'refresh'),
    };
  }

  /**
   * Verifies a JWT token and returns its payload.
   *
   * @param token - The JWT string to verify
   * @returns The decoded JWT payload if the token is valid
   * @throws UnauthorizedException if the token is invalid or expired
   */
  verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<JwtConfig>('jwt').secret,
      });
    } catch (err) {
      throw new UnauthorizedException(err.message || 'Token verification failed');
    }
  }

  /**
   * Registers a new user using email and password.
   *
   * Hashes the user's password, creates a new user record in the database,
   * and supports transactional registration via an optional QueryRunner.
   *
   * @param user - The DTO containing user registration details (email, password, etc.)
   * @param qr - Optional TypeORM QueryRunner for transactional support
   * @returns The newly created User entity
   * @throws BadRequestException if registration fails or input is invalid
   */
  async registerWithEmail(user: CreateUserDto, qr?: QueryRunner): Promise<User> {
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

    return newUser;
  }

  /**
   * Authenticates a user by email and password.
   *
   * @param user - An object containing the user's email and password
   * @returns The authenticated user object if credentials are valid
   * @throws UnauthorizedException if the user does not exist or password is invalid
   */
  private async authenticateUser(user: Pick<User, 'email' | 'password'>): Promise<User> {
    const userRecord = await this.userService.getUserByEmail(user.email);

    if (!userRecord) {
      throw new UnauthorizedException('Invalid email');
    }

    const isPasswordValid = await bcrypt.compare(user.password, userRecord.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    return userRecord;
  }

  /**
   * Logs in a user using email and password credentials.
   *
   * @param user - An object containing the user's email and password
   * @returns An object containing access and refresh tokens for the authenticated user
   * @throws UnauthorizedException if authentication fails
   */
  async loginWithEmail(user: Pick<User, 'email' | 'password'>) {
    const userRecord = await this.authenticateUser(user);

    const tokens = this.generateTokens(userRecord);

    await this.userService.updateRefreshToken(userRecord.id, tokens.refreshToken);

    const ttl = this.configService.get<JwtConfig>('jwt').refreshTokenTtl;

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ms(ttl as ms.StringValue),
    };

    return { ...tokens, cookieOptions };
  }

  /**
   * Decodes a base64-encoded Basic authentication credential into email and password.
   *
   * Expects the decoded string to be in the format "email:password".
   * Throws an UnauthorizedException if the format is invalid or if either field is empty.
   *
   * @param base64Credential - The base64-encoded "email:password" string from the Authorization header
   * @returns An object containing the extracted email and password
   * @throws UnauthorizedException if the format is invalid or fields are missing
   */
  decodeBasicToken(base64Credential: string) {
    const decodedCredential = Buffer.from(base64Credential, 'base64').toString('utf8');

    const separatorIdx = decodedCredential.indexOf(':');

    if (separatorIdx === -1) {
      throw new UnauthorizedException(
        'Invalid Basic authentication format. Expected "email:password"'
      );
    }

    const email = decodedCredential.slice(0, separatorIdx);
    const password = decodedCredential.slice(separatorIdx + 1);

    if (!email || !password) {
      throw new UnauthorizedException('Email or password cannot be empty in Basic authentication');
    }

    return { email, password };
  }
}
