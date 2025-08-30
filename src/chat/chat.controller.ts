import { Body, Controller, Param, Post, UseInterceptors } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateGroupChatDto } from './dto/create-chatroom.dto';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { TxQueryRunner } from 'src/common/decorator/query-runner.decorator';
import { QueryRunner } from 'typeorm';
import { CurrentUser } from 'src/user/decorator/user.decorator';
import { User } from 'src/user/entity/user.entity';
import { AddChatRoomMemberDto } from './dto/add-chatroom-member';
import { ChatGateway } from './chat.gateway';

@Controller('chats')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway
  ) {}

  @Post('create/group')
  @UseInterceptors(TransactionInterceptor)
  postCreateGroupChat(
    @Body() body: CreateGroupChatDto,
    @CurrentUser() user: User,
    @TxQueryRunner() qr: QueryRunner
  ) {
    return this.chatService.createGroupChat(body, user, qr);
  }

  // add memeber to room
  @Post('/invite/:roomId/members')
  @UseInterceptors(TransactionInterceptor)
  async postAddChatRoomMebers(
    @Param('roomId') roomId: string,
    @Body() body: AddChatRoomMemberDto,
    @CurrentUser() user: User,
    @TxQueryRunner() qr: QueryRunner
  ) {
    const newMembers = await this.chatService.addChatRoomMember(
      {
        roomId,
        memberIds: body.memberIds,
        inviterId: user.id,
      },
      qr
    );

    await this.chatGateway.notifyInvitation(roomId, user, newMembers, qr);

    return { status: 'success', added: newMembers.length };
  }
}
