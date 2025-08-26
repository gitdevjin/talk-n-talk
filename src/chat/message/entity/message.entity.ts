import { ChatRoom } from 'src/chat/entity/chatroom.entity';
import { BaseEntity } from 'src/common/entity/base.entity';
import { User } from 'src/user/entity/user.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class Message extends BaseEntity {
  @Column()
  roomId: string;

  @ManyToOne(() => ChatRoom, (chatroom) => chatroom.messages)
  @JoinColumn({ name: 'roomId' })
  chatRoom: ChatRoom;

  @Column()
  senderId: string;

  @ManyToOne(() => User, (user) => user.messages)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column()
  content: string;
}
