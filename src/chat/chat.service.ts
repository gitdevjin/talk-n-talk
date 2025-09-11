import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { BaseEntity } from 'src/common/entity/base.entity';
import { DataSource, EntityTarget, In, QueryRunner, Repository } from 'typeorm';
import { ChatRoom } from './entity/chatroom.entity';
import { ChatRoomMember } from './entity/chatroom-member.entity';
import { CreateGroupChatDto } from './dto/create-chatroom.dto';
import { User } from 'src/user/entity/user.entity';
import { PinoLogger } from 'nestjs-pino';
import { UserService } from 'src/user/user.service';
import { MessageService } from './message/message.service';
import { MessageType } from './message/entity/message.entity';

interface AddChatRoomMemberArgs {
  roomId: string;
  memberIds: string[];
  inviter: User;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
    private readonly messageService: MessageService,
    private readonly logger: PinoLogger
  ) {}

  private getRepository<T extends BaseEntity>(
    entity: EntityTarget<T>,
    qr?: QueryRunner
  ): Repository<T> {
    return qr ? qr.manager.getRepository<T>(entity) : this.dataSource.getRepository<T>(entity);
  }

  async getGroupChatsForUser(user: User) {
    const chatRoomRepository = this.getRepository(ChatRoom);

    const groupChats = await chatRoomRepository.find({
      where: {
        isGroup: true,
        members: {
          userId: user.id,
        },
      },
    });

    return groupChats;
  }

  async getDirectMessagesForUser(user: User) {
    const chatRoomRepository = this.getRepository(ChatRoom);

    const dms = await chatRoomRepository.find({
      where: {
        isGroup: false,
        members: {
          userId: user.id,
        },
      },
    });

    const dmsWithFriend = await chatRoomRepository.find({
      where: {
        id: In(dms.map((dm) => dm.id)),
      },
      relations: {
        members: {
          user: true,
        },
      },
    });
    return dmsWithFriend;
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

  async createDM(creator: User, friendId: string, qr?: QueryRunner) {
    const chatRoomRepository = this.getRepository(ChatRoom, qr);
    const userRepostiroy = this.getRepository(User, qr);

    const friend = await userRepostiroy.findOne({
      where: {
        id: friendId,
      },
    });

    if (!friend) {
      throw new BadRequestException("The user doesn't exist");
    }

    const sortedIds = [creator.id, friendId].sort();
    const dmKey = `${sortedIds[0]}_${sortedIds[1]}`;

    const existingDm = await chatRoomRepository.findOne({
      where: {
        dmKey: dmKey,
        isGroup: false,
      },
      relations: {
        members: {
          user: true,
        },
      },
    });

    if (existingDm) {
      return { dm: existingDm, friend: friend };
    }

    const newDm = await chatRoomRepository.save(
      chatRoomRepository.create({
        isGroup: false,
        dmKey,
        members: [{ user: creator }, { user: friend }],
      })
    );

    const messageContent = `Direct message started between ${creator.username} and ${friend.username}`;

    const systemMessage = await this.messageService.createMessage(
      { roomId: newDm.id, content: messageContent, type: MessageType.SYSTEM },
      undefined,
      qr
    );

    return {
      dm: newDm,
      friend: friend,
      systemMessage,
    };
  }

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

    const isInviterValid = await this.isChatMember(args.inviter.id, args.roomId, qr);

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

    const messageContent = `User ${args.inviter.username} invited ${members
      .map((m) => m.user.username)
      .join(', ')}`;

    const systemMessage = await this.messageService.createMessage(
      { roomId: args.roomId, content: messageContent, type: MessageType.SYSTEM },
      undefined,
      qr
    );

    const newMembers = await roomMemberRepository.save(members);

    return { newMembers, systemMessage };
  }
}
