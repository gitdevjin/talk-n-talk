import { Body, Controller, Get, Param, Post, UseInterceptors } from '@nestjs/common';
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

  @Get('group')
  getAllGroupChats(@CurrentUser() user: User) {
    return this.chatService.getGroupChatsForUser(user);
  }

  @Get('group/:roomId/members')
  getAllMembersForGroupChat(@Param('roomId') roomId: string) {
    return this.chatService.getGroupChatMembers(roomId);
  }

  // Get Direct Message list for one user
  @Get('dms')
  async getAllDms(@CurrentUser() user: User) {
    return await this.chatService.getDirectMessagesForUser(user);
  }

  @Post('group')
  @UseInterceptors(TransactionInterceptor)
  postCreateGroupChat(
    @Body() body: CreateGroupChatDto,
    @CurrentUser() user: User,
    @TxQueryRunner() qr: QueryRunner
  ) {
    return this.chatService.createGroupChat(body, user, qr);
  }

  @Get('invite/:roomId/members')
  getInviteCandidates(@CurrentUser() user: User, @Param('chatId') chatId: string) {
    return this.chatService.getInviteCandidates(user, chatId);
  }

  // add memeber to room
  @Post('invite/:roomId/members')
  @UseInterceptors(TransactionInterceptor)
  async postAddChatRoomMebers(
    @Param('roomId') roomId: string,
    @Body() body: AddChatRoomMemberDto,
    @CurrentUser() user: User,
    @TxQueryRunner() qr: QueryRunner
  ) {
    const { newMembers, systemMessage } = await this.chatService.addChatRoomMember(
      {
        roomId,
        memberIds: body.memberIds,
        inviter: user,
      },
      qr
    );

    await this.chatGateway.notifyInvitation(roomId, user, newMembers, systemMessage);

    return { status: 'success', added: newMembers.length };
  }

  // Create Direct Message with a user(doesn't have to be a friend)
  // this nees to be fixed, the logic check if the room eixsts should be changed
  @Post('dms/:friendId')
  @UseInterceptors(TransactionInterceptor)
  async postCreateDm(
    @Param('friendId') friendId: string,
    @CurrentUser() user: User,
    @TxQueryRunner() qr: QueryRunner
  ) {
    const { dm, friend, systemMessage } = await this.chatService.createDM(user, friendId, qr);
    console.log(systemMessage);
    if (systemMessage) {
      await this.chatGateway.notifyDirectMessage(dm.id, user, friend, systemMessage);
      return { status: 'success', added: `${friend.username}` };
    } else {
      return { status: 'success', message: 'already have dm with the friend' };
    }
  }

  //Get All messages for a chatroom
  @Get(':roomId/messages')
  async getMessages(@Param(`roomId`) roomId: string, @CurrentUser() user: User) {
    return this.chatService.getAllMessagesForChat(roomId, user);
  }
}
