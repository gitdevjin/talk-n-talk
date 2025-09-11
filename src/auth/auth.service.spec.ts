import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

describe('AuthService Testing', () => {
  let authService: AuthService;
  let mockUserService: Partial<Record<keyof UserService, jest.Mock>>;
  let mockJwtService: Partial<JwtService>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockUserService = {
      getUserByEmail: jest.fn(),
      createUser: jest.fn(),
      updateRefreshToken: jest.fn(),
    };

    mockJwtService = { sign: jest.fn() };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'jwt') {
          return { secret: 'secret-string', accessTokenTtl: '1h', refreshTokenTtl: '7d' };
        }

        if (key === 'auth') {
          return { hashRounds: 10 };
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('authService should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('extractTokenFromHeader function', () => {
    it('basic token should be extracted correctly', () => {
      const scheme = 'basic';
      const token = '!@#$#abcd';
      const result = authService.extractTokenFromHeader(`${scheme} ${token}`);
      expect(result).toBe(token);
    });

    it('Token Scheme should be case-insensitive', () => {
      const scheme = 'Basic';
      const token = '!@#$#abcd';
      const result = authService.extractTokenFromHeader(`${scheme} ${token}`);
      expect(result).toBe(token);
    });

    it('Scheme Mismatch Should throw Error', () => {
      const scheme = 'wrongBearer';
      const token = '!@#$#abcd';
      expect(() => authService.extractTokenFromHeader(`${scheme} ${token}`)).toThrow(
        BadRequestException
      );
    });

    it('Authorization Header of Wrong Format Should throw Error', () => {
      const scheme = 'Basic';
      const token = '!@#$#abcd';
      expect(() => authService.extractTokenFromHeader(`${scheme} ${token} asdfgh`)).toThrow(
        BadRequestException
      );
    });
  });

  describe('signToken function', () => {
    it('should call jwtService.sign with correct arguments when creating an access token', () => {
      (mockJwtService.sign as jest.Mock).mockReturnValue('mockTestResult');

      const token = authService['signToken'](
        { email: 'test@test.com', id: 'testRandomUserId' },
        'access'
      );

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          email: 'test@test.com',
          sub: 'testRandomUserId',
          type: 'access',
        },
        {
          secret: 'secret-string',
          expiresIn: '1h',
        }
      );

      expect(token).toBe('mockTestResult');
    });

    it('should call jwtService.sign with correct arguments when creating an refresh token', () => {
      (mockJwtService.sign as jest.Mock).mockReturnValue('mockTestResult');

      const token = authService['signToken'](
        { email: 'test@test.com', id: 'testRandomUserId' },
        'refresh'
      );

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          email: 'test@test.com',
          sub: 'testRandomUserId',
          type: 'refresh',
        },
        {
          secret: 'secret-string',
          expiresIn: '7d',
        }
      );

      expect(token).toBe('mockTestResult');
    });
  });

  describe('generateToken', () => {
    it('should call signToken for both access and refresh tokens', () => {
      const user = { email: 'test@test.com', id: 'fakeUserId' };

      const signTokenSpy = jest
        .spyOn(authService as any, 'signToken')
        .mockImplementation((user, type) =>
          type === 'access' ? 'mockAccessToken' : 'mockRefreshToken'
        );

      const tokens = authService['generateTokens'](user);

      expect(signTokenSpy).toHaveBeenCalledTimes(2);
      expect(signTokenSpy).toHaveBeenCalledWith(user, 'access');
      expect(signTokenSpy).toHaveBeenCalledWith(user, 'refresh');

      expect(tokens).toEqual({
        accessToken: 'mockAccessToken',
        refreshToken: 'mockRefreshToken',
      });
    });
  });
});
