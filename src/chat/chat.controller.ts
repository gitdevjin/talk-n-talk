import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateGroupChatDto } from './dto/create-chatroom.dto';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { TxQueryRunner } from 'src/common/decorator/query-runner.decorator';
import { QueryRunner } from 'typeorm';

@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('create/group')
  @UseInterceptors(TransactionInterceptor)
  postCreateGroupChat(@Body() dto: CreateGroupChatDto, @TxQueryRunner() qr: QueryRunner) {
    return this.chatService.createGroupChat(dto, qr);
  }
}
