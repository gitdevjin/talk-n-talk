import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Friendship, FriendshipStatus } from './entity/friendship.entity';
import { In, QueryRunner, Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { UserService } from './user.service';

@Injectable()
export class FriendshipService {
  private static VALID_TRANSITIONS = {
    [FriendshipStatus.PENDING]: [
      FriendshipStatus.ACCEPTED,
      FriendshipStatus.DECLINED,
      FriendshipStatus.BLOCKED,
    ],
    [FriendshipStatus.ACCEPTED]: [FriendshipStatus.BLOCKED],
    [FriendshipStatus.DECLINED]: [FriendshipStatus.PENDING, FriendshipStatus.BLOCKED],
    [FriendshipStatus.BLOCKED]: [],
  };

  constructor(
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    private readonly userService: UserService
  ) {}

  private getRepository(qr?: QueryRunner) {
    return qr ? qr.manager.getRepository<Friendship>(Friendship) : this.friendshipRepository;
  }

  async getAllFriends(user: User) {
    const friendships = await this.friendshipRepository.find({
      where: [
        {
          receiverId: user.id,
          status: FriendshipStatus.ACCEPTED,
        },
        { requesterId: user.id, status: FriendshipStatus.ACCEPTED },
      ],
      relations: {
        requester: {
          profile: true,
        },
        receiver: {
          profile: true,
        },
      },
    });

    console.log(friendships);
    const friends = friendships.map((f) => (f.requesterId === user.id ? f.receiver : f.requester));

    return friends;
  }

  // send friendship request
  async createFriendship(user: User, friendId: string) {
    //validate friendId by searching the user of the id
    const friend = await this.userService.getUserById(friendId);
    if (!friend) {
      throw new NotFoundException("The user doesn't exist");
    }

    if (user.id === friendId) {
      throw new BadRequestException("You can't add yourself as a friend");
    }

    const friendshipKey = [user.id, friendId].sort().join('_');

    const existing = await this.friendshipRepository.findOne({
      where: { friendshipKey },
    });

    // CASE 1: no friendship exists → create new
    if (!existing) {
      const friendship = this.friendshipRepository.create({
        requesterId: user.id,
        receiverId: friendId,
        status: FriendshipStatus.PENDING,
        friendshipKey,
      });

      return this.friendshipRepository.save(friendship);
    }

    // CASE 2: existing friendship found → handle by status
    switch (existing.status) {
      case FriendshipStatus.PENDING:
        if (existing.requesterId === user.id) {
          throw new ConflictException('Friend request already sent');
        } else {
          // The other person sent one → accept automatically
          existing.status = FriendshipStatus.ACCEPTED;
          return this.friendshipRepository.save(existing);
        }

      case FriendshipStatus.ACCEPTED:
        throw new ConflictException('You are already friends');

      case FriendshipStatus.DECLINED:
        // Reopen the request (new requester)
        existing.requesterId = user.id;
        existing.receiverId = friendId;
        existing.status = FriendshipStatus.PENDING;
        return this.friendshipRepository.save(existing);

      case FriendshipStatus.BLOCKED:
        throw new ForbiddenException('Cannot send friend request — user is blocked');

      default:
        throw new ConflictException('Invalid friendship status');
    }
  }

  async updateFriendship(user: User, friendshipId: string, status: FriendshipStatus) {
    const friendship = await this.friendshipRepository.findOne({
      where: {
        id: friendshipId,
      },
    });

    if (!friendship) throw new NotFoundException('Friend request not found');
    if (status === FriendshipStatus.BLOCKED) {
      if (friendship.receiverId !== user.id && friendship.requesterId !== user.id) {
        throw new ForbiddenException('Not allowed to block this user');
      }
    } else {
      if (friendship.receiverId !== user.id) {
        throw new ForbiddenException('Not allowed to update this request');
      }
    }

    if (!FriendshipService.VALID_TRANSITIONS[friendship.status].includes(status)) {
      throw new BadRequestException('Invalid status transition');
    }

    friendship.status = status;
    return this.friendshipRepository.save(friendship);
  }

  async searchUsersWithFriendStatus(user: User, username: string) {
    const users = await this.userService.getAllUsersByUsername(username);

    const friendships = await this.friendshipRepository.find({
      where: [{ requester: { id: user.id } }, { receiver: { id: user.id } }],
      relations: ['requester', 'receiver'],
    });

    const statusMap = new Map<string, string>();

    friendships.forEach((f) => {
      const friendId = f.requester.id === user.id ? f.receiver.id : f.requester.id;
      statusMap.set(friendId, f.status);
    });

    const result = users
      .filter((u) => u.id !== user.id)
      .map((u) => ({
        id: u.id,
        username: u.username,
        profile: u.profile,
        status: statusMap.get(u.id) || 'none',
      }));

    return result;
  }

  async getIncomingFriendships(user: User) {
    const friendRequests = await this.friendshipRepository.find({
      where: {
        receiverId: user.id,
        status: In([FriendshipStatus.PENDING, FriendshipStatus.DECLINED]),
      },
      relations: {
        requester: true,
      },
    });

    return friendRequests;
  }

  async getOutgoingFriendships(user: User) {
    const friendRequests = await this.friendshipRepository.find({
      where: {
        requesterId: user.id,
        status: FriendshipStatus.PENDING,
      },
      relations: {
        receiver: true,
      },
    });

    return friendRequests;
  }

  // cancel friendship request
  async deleteFriendshipRequest(user: User, requestId: string) {
    const request = await this.friendshipRepository.findOne({
      where: {
        id: requestId,
      },
    });

    if (!request) {
      throw new NotFoundException('Friendship request not found');
    }

    if (request.requesterId !== user.id) {
      throw new BadRequestException('You are not authorized to delete this request');
    }

    return await this.friendshipRepository.delete({ id: requestId });
  }

  // delete friendship request
  async deleteFrined(user: User, friendId: string) {
    const friendship = await this.friendshipRepository.findOne({
      where: [
        { requesterId: user.id, receiverId: friendId },
        { requesterId: friendId, receiverId: user.id },
      ],
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.friendshipRepository.remove(friendship);
    return { message: 'Friend removed successfully' };
  }

  // delete friendship (regardless of satatus)
}
