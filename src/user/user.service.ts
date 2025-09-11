import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { In, QueryRunner, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { PinoLogger } from 'nestjs-pino';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from 'src/config/auth.config';
import * as bcrypt from 'bcrypt';
import { ProfileService } from 'src/profile/profile.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly profileService: ProfileService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger
  ) {}

  private getRepository(qr?: QueryRunner) {
    return qr ? qr.manager.getRepository<User>(User) : this.userRepository;
  }

  async getUserByEmail(email: string) {
    return this.userRepository.findOne({
      where: {
        email,
      },
      relations: {
        profile: true,
      },
    });
  }

  async createUser(createUserDto: CreateUserDto, qr?: QueryRunner) {
    const repository = this.getRepository(qr);
    const { email, username, password } = createUserDto;

    // Check if username or email already exists
    const [isUsernameTaken, isEmailTaken] = await Promise.all([
      repository.exists({ where: { username } }),
      repository.exists({ where: { email } }),
    ]);

    if (isUsernameTaken) {
      throw new BadRequestException('Username already exists');
    }

    if (isEmailTaken) {
      throw new BadRequestException('Email already exists');
    }

    // Create user entity
    const user = repository.create({
      email,
      username,
      password,
    });

    const newUser = await repository.save(user);
    const profile = await this.profileService.createProfile(newUser, qr);
    newUser.profile = profile;

    this.logger.info(`User[${newUser.username}] Created in ${UserService.name}`);
    return newUser;
  }

  async updateUser(userId: string, dto: UpdateUserDto) {}

  async updateRefreshToken(userId: string, refreshToken: string, qr?: QueryRunner) {
    const repository = this.getRepository(qr);
    const hashedToken = await bcrypt.hash(
      refreshToken,
      this.configService.get<AuthConfig>('auth').hashRounds
    );

    const result = await repository.update(userId, { refreshToken: hashedToken });

    if (result.affected === 0) {
      this.logger.warn(`Failed to update refresh token for userId: ${userId}`);
      throw new InternalServerErrorException('Refresh token update failed');
    }

    return true;
  }

  async validateUserIds(userIds: string[], qr?: QueryRunner) {
    const repository = this.getRepository(qr);

    const exsitingUsers = await repository.find({
      where: { id: In(userIds) },
      select: { id: true },
    });

    const exsitingUserIds = exsitingUsers.map((user) => user.id);

    const invalidUserIds = userIds.filter((userId) => !exsitingUserIds.includes(userId));

    if (invalidUserIds.length > 0) {
      throw new BadRequestException({ message: 'Invalid User IDs', invalidUserIds });
    }
  }
}
