import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseEntity } from 'src/common/entity/base.entity';
import { DataSource, EntityTarget, In, QueryRunner, Repository } from 'typeorm';
import { ChatRoom } from './entity/chatroom.entity';
import { ChatRoomMember } from './entity/chatroom-member.entity';
import { CreatGroupChatDto } from './dto/create-chatroom.dto';
import { User } from 'src/user/entity/user.entity';

@Injectable()
export class ChatService {
  constructor(private readonly dataSource: DataSource) {}

  private getRepository<T extends BaseEntity>(
    entity: EntityTarget<T>,
    qr?: QueryRunner
  ): Repository<T> {
    return qr ? qr.manager.getRepository<T>(entity) : this.dataSource.getRepository<T>(entity);
  }

  async createGroupChat(dto: CreatGroupChatDto, qr?: QueryRunner) {
    const chatRoomRepository = this.getRepository(ChatRoom, qr);
    const userRepository = this.getRepository(User, qr);

    const users = await userRepository.find({
      where: {
        id: In(dto.memberIds),
      },
    });

    if (users.length !== dto.memberIds.length) {
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

    return newChatRoom;
  }
}
