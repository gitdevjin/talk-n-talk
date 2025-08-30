import { User } from 'src/user/entity/user.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ChatRoom } from './chatroom.entity';
import { BaseEntity } from 'src/common/entity/base.entity';
import { Type } from 'class-transformer';

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
  @Type(() => User) // This is for class-transformer e.g.) @Exclude({toPlainOnly:true})
  user: User;
}
