import { BaseEntity } from 'src/common/entity/base.entity';
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
  DECLINED = 'declined',
}

@Entity('friendships')
export class Friendship extends BaseEntity {
  @Column()
  requesterId: string;

  @Column()
  receiverId: string;

  @Column({
    type: 'enum',
    enum: FriendshipStatus,
    default: FriendshipStatus.PENDING,
  })
  status: FriendshipStatus;

  @Column()
  friendshipKey: string;

  @ManyToOne(() => User, (user) => user.outgoingFriendship)
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @ManyToOne(() => User, (user) => user.incomingFriendship)
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  @BeforeInsert()
  @BeforeUpdate()
  setFriendshipKey() {
    const ids = [this.requesterId, this.receiverId].sort();
    this.friendshipKey = `${ids[0]}_${ids[1]}`;
  }
}
