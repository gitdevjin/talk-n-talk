import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly logger: PinoLogger
  ) {}

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
}
