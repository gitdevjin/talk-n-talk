import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

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

    mockJwtService = { sign: jest.fn(), verify: jest.fn() };

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
    jest.resetAllMocks(); // resets manual mocks (calls, return values)
    jest.restoreAllMocks(); // restores original implementations for spies
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

  describe('verifyToken', () => {
    it('should return decoded payload when token is valid', () => {
      const token = 'fakeToken';
      const decodedPayload = { email: 'test@test.com', sub: 'fakeUserId', type: 'access' };

      (mockJwtService.verify as jest.Mock).mockReturnValue(decodedPayload);

      const result = authService.verifyToken(token);

      expect(result).toEqual(decodedPayload);
      expect(mockConfigService.get).toHaveBeenCalledWith('jwt');
      expect(mockJwtService.verify).toHaveBeenCalledWith(token, { secret: 'secret-string' });
    });

    //probably I should add a test for catching error
  });

  describe('registerWithEmail', () => {
    it('should hash the password and create a new user', async () => {
      const userDto = { email: 'test@test.com', username: 'testUser', password: 'testPassword' };
      const hashedPwd = 'fakeHash';
      const createdUser = { id: 'fakeUserId', username: 'testUser', email: 'test@test.com' };

      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPwd);

      mockUserService.createUser.mockResolvedValue(createdUser);

      const result = await authService.registerWithEmail(userDto);

      expect(mockConfigService.get).toHaveBeenCalledWith('auth');
      expect(bcrypt.hash).toHaveBeenCalledWith('testPassword', 10);
      expect(mockUserService.createUser).toHaveBeenCalledWith(
        { ...userDto, password: hashedPwd },
        undefined
      );

      expect(result).toEqual(createdUser);
    });
  });

  describe('authenticateUser', () => {
    it('should return the user if email exists and password is correct', async () => {
      const userInput = { email: 'test@test.com', password: 'plainPassword' };
      const userRecord = { email: 'test@test.com', password: 'hashedPassword' };

      mockUserService.getUserByEmail.mockResolvedValue(userRecord);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await authService['authenticateUser'](userInput);

      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(userInput.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(userInput.password, userRecord.password);
      expect(result).toEqual(userRecord);
    });

    it('should throw UnauthorizedException if email does not exist', async () => {
      const userInput = { email: 'test@test.com', password: 'plainPassword' };

      mockUserService.getUserByEmail.mockResolvedValue(null);

      await expect(authService['authenticateUser'](userInput)).rejects.toThrow('Invalid email');
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const userInput = { email: 'test@test.com', password: 'wrongPassword' };
      const userRecord = { email: 'test@test.com', password: 'hashedPassword' };

      mockUserService.getUserByEmail.mockResolvedValue(userRecord);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await expect(authService['authenticateUser'](userInput)).rejects.toThrow('Invalid password');
    });
  });

  describe('loginWithEmail', () => {
    it('should call authenticateUser and return tokens with cookieOptions', async () => {
      const mockUser = { id: 'fakeId', email: 'test@test.com' };
      const mockToken = { accessToken: 'mockAccessToken', refreshToken: 'mockRefreshToken' };

      authService['authenticateUser'] = jest.fn().mockResolvedValue(mockUser);
      authService['generateTokens'] = jest.fn().mockReturnValue(mockToken);

      const result = await authService.loginWithEmail({
        email: 'test@test.com',
        password: 'testPassword',
      });

      expect(authService['authenticateUser']).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'testPassword',
      });

      expect(mockUserService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        mockToken.refreshToken
      );

      expect(result).toEqual({
        ...mockToken,
        cookieOptions: expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: expect.any(Number),
        }),
      });
    });
  });

  describe('decodeBasicToken', () => {
    it('should decode valid base64 credentials', () => {
      const email = 'test@example.com';
      const password = 'testPassword';
      const base64 = Buffer.from(`${email}:${password}`).toString('base64');

      const result = authService.decodeBasicToken(base64);

      expect(result).toEqual({ email, password });
    });

    it('should throw if missing colon separator', () => {
      const base64 = Buffer.from('invalidStrings').toString('base64');

      expect(() => authService.decodeBasicToken(base64)).toThrow(UnauthorizedException);
    });

    it('should throw if email is empty', () => {
      const base64 = Buffer.from(':password').toString('base64');

      expect(() => authService.decodeBasicToken(base64)).toThrow(UnauthorizedException);
    });

    it('should throw if password is empty', () => {
      const base64 = Buffer.from('test@example.com:').toString('base64');

      expect(() => authService.decodeBasicToken(base64)).toThrow(UnauthorizedException);
    });
  });
});
