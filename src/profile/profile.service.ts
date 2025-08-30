import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile } from './entity/profile.entity';
import { QueryRunner, Repository } from 'typeorm';
import { User } from 'src/user/entity/user.entity';

@Injectable()
export class ProfileService {
  constructor(@InjectRepository(Profile) private readonly profileRepository: Repository<Profile>) {}

  private getRepository(qr?: QueryRunner) {
    return qr ? qr.manager.getRepository<Profile>(Profile) : this.profileRepository;
  }

  async createProfile(user: User, qr?: QueryRunner) {
    const repository = this.getRepository(qr);

    const profile = repository.create({
      name: user.username,
      user,
    });

    return await repository.save(profile);
  }
}
