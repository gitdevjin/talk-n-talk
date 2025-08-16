import { BaseEntity } from 'src/common/entity/base.entity';
import { Profile } from 'src/profile/entity/profile.entity';
import { Column, Entity, OneToOne } from 'typeorm';

export enum RolesEnum {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ unique: true })
  username: string;

  @Column({
    type: 'enum',
    enum: Object.values(RolesEnum),
    default: RolesEnum.USER,
  })
  role: RolesEnum;

  @Column({ nullable: true })
  refreshToken: string;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile: Profile;
}
