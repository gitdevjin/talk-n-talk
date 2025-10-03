import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Friendship } from './entity/friendship.entity';
import { QueryRunner, Repository } from 'typeorm';

@Injectable()
export class FriendshipService {
  constructor(
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>
  ) {}

  private getRepository(qr?: QueryRunner) {
    return qr ? qr.manager.getRepository<Friendship>(Friendship) : this.friendshipRepository;
  }

  // send friendship request

  // decline friendship request

  // accept friendship request

  // delete friendship request

  // delete friendship (regardless of satatus)
}
