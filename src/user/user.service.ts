import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { PinoLogger } from 'nestjs-pino';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from 'src/config/auth.config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger
  ) {}

  async getUserByEmail(email: string) {
    return this.userRepository.findOne({
      where: {
        email,
      },
    });
  }

  async createUser(createUserDto: CreateUserDto) {
    const { email, username, password } = createUserDto;

    // Check if username or email already exists
    const [isUsernameTaken, isEmailTaken] = await Promise.all([
      this.userRepository.exists({ where: { username } }),
      this.userRepository.exists({ where: { email } }),
    ]);

    if (isUsernameTaken) {
      throw new BadRequestException('Username already exists');
    }

    if (isEmailTaken) {
      throw new BadRequestException('Email already exists');
    }

    // Create user entity
    const user = this.userRepository.create({
      email,
      username,
      password,
    });

    const newUser = await this.userRepository.save(user);
    this.logger.info(`User[${newUser.username}] Created in ${UserService.name}`);
    return newUser;
  }

  async updateUser(userId: string, dto: UpdateUserDto) {}

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedToken = await bcrypt.hash(
      refreshToken,
      this.configService.get<AuthConfig>('auth').hashRounds
    );

    const result = await this.userRepository.update(userId, { refreshToken: hashedToken });

    if (result.affected === 0) {
      this.logger.warn(`Failed to update refresh token for userId: ${userId}`);
      throw new InternalServerErrorException('Refresh token update failed');
    }
  }
}
