import { PickType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Message, MessageType } from '../entity/message.entity';

export class CreateMessageDto extends PickType(Message, ['roomId', 'content']) {
  @IsString()
  roomId: string;

  @IsString()
  content: string;

  @IsEnum(MessageType)
  type?: MessageType = MessageType.TEXT;
}
