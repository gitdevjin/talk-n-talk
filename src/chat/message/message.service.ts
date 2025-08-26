import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Message } from './entity/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from 'src/user/entity/user.entity';
import { PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly logger: PinoLogger
  ) {}

  async createMessage(dto: CreateMessageDto, sender: User) {
    const message = await this.messageRepository.save({
      ...dto,
      senderId: sender.id,
    });

    this.logger.info(
      { id: message.id, roomId: message.roomId, senderId: message.senderId },
      'Message is Created'
    );

    return message;
  }
}
