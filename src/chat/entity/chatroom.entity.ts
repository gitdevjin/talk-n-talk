import { BaseEntity } from 'src/common/entity/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { ChatRoomMember } from './chatroom-member.entity';
import { Message } from '../message/entity/message.entity';

@Entity('ChatRooms')
export class ChatRoom extends BaseEntity {
  @Column({ nullable: true })
  roomname?: string;

  @Column()
  isGroup: boolean;

  @Column({ nullable: true, unique: true })
  dmKey?: string;

  @OneToMany(() => ChatRoomMember, (chatRoomMember) => chatRoomMember.room, { cascade: ['insert'] })
  members: ChatRoomMember[];

  @OneToMany(() => Message, (message) => message.chatRoom)
  messages: Message[];
}
