import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entity/chatroom.entity';
import { ChatController } from './chat.controller';
import { Message } from './message/entity/message.entity';
import { MessageController } from './message/message.controller';
import { MessageService } from './message/message.service';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), AuthModule, UserModule],
  controllers: [ChatController, MessageController],
  providers: [ChatGateway, ChatService, MessageService],
  exports: [ChatService],
})
export class ChatModule {}
