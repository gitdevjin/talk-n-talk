import { Controller } from '@nestjs/common';
import { MessageService } from './message.service';

@Controller('chats/messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}
}
