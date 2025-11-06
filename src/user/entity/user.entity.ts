import { Exclude } from 'class-transformer';
import { ChatRoomMember } from 'src/chat/entity/chatroom-member.entity';
import { Message } from 'src/chat/message/entity/message.entity';
import { BaseEntity } from 'src/common/entity/base.entity';
import { Profile } from 'src/profile/entity/profile.entity';
import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { Friendship } from './friendship.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({ unique: true })
  username: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  refreshToken: string;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile: Profile;

  @OneToMany(() => ChatRoomMember, (chatRoomMember) => chatRoomMember.user, { cascade: true })
  chatrooms: ChatRoomMember[];

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];

  @OneToMany(() => Friendship, (friendship) => friendship.requester)
  outgoingFriendship: Friendship[];

  @OneToMany(() => Friendship, (friendship) => friendship.receiver)
  incomingFriendship: Friendship[];
}
