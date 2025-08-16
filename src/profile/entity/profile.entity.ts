import { BaseEntity } from 'src/common/entity/base.entity';
import { User } from 'src/user/entity/user.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

@Entity('profiles')
export class Profile extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({ nullable: true })
  avatar?: string;

  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn()
  user: User;
}
