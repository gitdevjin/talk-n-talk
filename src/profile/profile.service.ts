import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile } from './entity/profile.entity';
import { QueryRunner, Repository } from 'typeorm';
import { User } from 'src/user/entity/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

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

  async updateProfile(user: User, dto: UpdateProfileDto, qr?: QueryRunner) {
    const repository = this.getRepository(qr);
    const profile = await repository.findOne({
      where: {
        user: {
          id: user.id,
        },
      },
    });

    profile.name = dto.name;
    profile.bio = dto.bio;
    const updatedProfile = await repository.save(profile);

    return updatedProfile;
  }
}
