import { BaseEntity } from 'src/common/entity/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { ChatRoomMember } from './chatroom-member.dto';

@Entity('ChatRooms')
export class ChatRoom extends BaseEntity {
  @Column({ nullable: true })
  roomname?: string;

  @Column()
  isGroup: boolean;

  @Column({ nullable: true })
  dmKey?: string;

  @OneToMany(() => ChatRoomMember, (chatRoomMember) => chatRoomMember.room)
  members: ChatRoomMember[];
}
