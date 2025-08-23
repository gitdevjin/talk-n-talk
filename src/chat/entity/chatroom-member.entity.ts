import { User } from 'src/user/entity/user.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ChatRoom } from './chatroom.entity';
import { BaseEntity } from 'src/common/entity/base.entity';

@Entity('ChatRoomMembers')
export class ChatRoomMember extends BaseEntity {
  @Column()
  roomId: string;

  @Column()
  userId: string;

  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  @ManyToOne(() => User, (user) => user.chatrooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
