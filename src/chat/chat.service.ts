import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { BaseEntity } from 'src/common/entity/base.entity';
import { DataSource, EntityTarget, In, QueryRunner, Repository } from 'typeorm';
import { ChatRoom } from './entity/chatroom.entity';
import { ChatRoomMember } from './entity/chatroom-member.entity';
import { CreateGroupChatDto } from './dto/create-chatroom.dto';
import { User } from 'src/user/entity/user.entity';
import { PinoLogger } from 'nestjs-pino';
import { UserService } from 'src/user/user.service';

interface AddChatRoomMemberArgs {
  roomId: string;
  memberIds: string[];
  inviterId: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
    private readonly logger: PinoLogger
  ) {}

  private getRepository<T extends BaseEntity>(
    entity: EntityTarget<T>,
    qr?: QueryRunner
  ): Repository<T> {
    return qr ? qr.manager.getRepository<T>(entity) : this.dataSource.getRepository<T>(entity);
  }

  async createGroupChat(dto: CreateGroupChatDto, creator: User, qr?: QueryRunner) {
    const chatRoomRepository = this.getRepository(ChatRoom, qr);
    const userRepository = this.getRepository(User, qr);

    const memberIds = new Set(dto.memberIds);
    memberIds.add(creator.id);

    const users = await userRepository.find({
      where: {
        id: In([...memberIds]),
      },
    });

    if (users.length !== memberIds.size) {
      throw new BadRequestException('One or more memberIds are invalid');
    }

    const chatRoom = chatRoomRepository.create({
      roomname: dto.roomname,
      isGroup: true,
      members: users.map((user) => ({ user })),
    });

    // Save the ChatRoom along with all members
    // - If a QueryRunner is provided, this operation is part of a transaction:
    //   ✅ All inserts (chat room + members) succeed or fail together
    // - If no QueryRunner is provided, TypeORM saves normally:
    //   ⚠️ Each insert happens individually; partial data could persist if an error occurs
    const newChatRoom = await chatRoomRepository.save(chatRoom);

    this.logger.info(
      {
        chatRoomId: newChatRoom.id,
        memberIds: newChatRoom.members.map((m) => m.userId),
        totalMembers: newChatRoom.members.length,
      },
      'New ChatRoom created'
    );

    return newChatRoom;
  }

  async createDM() {}

  async isChatMember(userId: string, roomId: string, qr?: QueryRunner) {
    const roomMemberRepository = this.getRepository<ChatRoomMember>(ChatRoomMember, qr);

    return await roomMemberRepository.exists({
      where: {
        userId,
        roomId,
      },
    });
  }

  async addChatRoomMember(args: AddChatRoomMemberArgs, qr?: QueryRunner) {
    const roomMemberRepository = this.getRepository<ChatRoomMember>(ChatRoomMember, qr);
    const userRepository = this.getRepository<User>(User, qr);

    const isInviterValid = await this.isChatMember(args.inviterId, args.roomId, qr);

    if (!isInviterValid) {
      throw new ForbiddenException('Inviter is not a member of this room');
    }

    // Check if the memberIds are valid
    await this.userService.validateUserIds(args.memberIds, qr);

    //Check duplicate memberIds and exclude them
    const users = await userRepository.find({
      where: {
        id: In(args.memberIds),
      },
    });

    const existingMembers = await roomMemberRepository.find({
      where: { roomId: args.roomId, userId: In(args.memberIds) },
      select: ['userId'],
    });

    const existingMemberIds = existingMembers.map((m) => m.userId);
    const newUsers = users.filter((user) => !existingMemberIds.includes(user.id));

    // Create member objects
    const members = newUsers.map((user) => {
      return roomMemberRepository.create({
        roomId: args.roomId,
        userId: user.id,
        user, // for preload
      });
    });

    const newMembers = await roomMemberRepository.save(members);

    return newMembers;
  }
}
