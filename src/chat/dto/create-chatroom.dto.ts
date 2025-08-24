import { PickType } from '@nestjs/mapped-types';
import { ChatRoom } from '../entity/chatroom.entity';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateGroupChatDto extends PickType(ChatRoom, ['roomname']) {
  @IsString()
  @IsOptional()
  roomname?: string;

  @IsString({ each: true })
  memberIds: string[];
}
