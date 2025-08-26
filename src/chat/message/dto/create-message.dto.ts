import { PickType } from '@nestjs/mapped-types';
import { IsString } from 'class-validator';
import { Message } from '../entity/message.entity';

export class CreateMessageDto extends PickType(Message, ['roomId', 'content']) {
  @IsString()
  roomId: string;

  @IsString()
  content: string;
}
