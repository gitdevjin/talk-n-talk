import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io';
import { PinoLogger } from 'nestjs-pino';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/entity/user.entity';
import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { WsExecptionFilter } from './filter/ws-exception.filter';
import { CreateMessageDto } from './message/dto/create-message.dto';
import { MessageService } from './message/message.service';
import { ChatRoomMember } from './entity/chatroom-member.entity';
import { Message } from './message/entity/message.entity';
import * as cookie from 'cookie';

@WebSocketGateway({
  namespace: 'chats',
  cors: {
    origin: process.env.TALK_AND_TALK_CLIENT_URL,
    credentials: true,
  },
})
@UseFilters(WsExecptionFilter)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ChatGateway implements OnGatewayConnection {
  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly messageService: MessageService,
    private readonly logger: PinoLogger
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket & { user: User }) {
    const cookies = client.handshake.headers.cookie;
    const parsedCookies = cookies ? cookie.parse(cookies) : {};
    const token = parsedCookies.accessToken;

    if (!token) {
      this.logger.warn({ clientId: client.id }, 'Missing access token — disconnecting client');
      client.emit('authError', { message: 'Access token missing or expired' });
      client.disconnect();
      return; // Stop here, do not throw
    }

    try {
      const payload = this.authService.verifyToken(token);
      const user = await this.userService.getUserByEmail(payload.email);

      client.user = user;

      client.join(`user:${user.id}`);

      this.logger.info({ clientId: client.id }, 'Client connection established');

      return true;
    } catch (err) {
      client.disconnect();
      this.logger.warn({ clientId: client.id }, 'Client connection failed');
      throw new WsException(err.message || 'WebSocket Connection Authentication Error');
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() body: { roomId: string },
    @ConnectedSocket() client: Socket & { user: User }
  ) {
    const isMember = await this.chatService.isChatMember(client.user.id, body.roomId);

    if (!isMember) {
      this.logger.warn({ clientId: client.id, roomId: body.roomId }, 'Joining ChatRoom Failed');
      throw new WsException(`Unauthroized to join this room`);
    }

    client.join(body.roomId);

    this.logger.info({ clientId: client.id, roomId: body.roomId }, 'Client Joined ChatRoom');

    return { status: 'success', roomId: body.roomId };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() body: CreateMessageDto,
    @ConnectedSocket() client: Socket & { user: User }
  ) {
    // Check if the sender is in the room
    if (!client.rooms.has(body.roomId)) {
      throw new WsException('You are not in the Room');
    }

    //Save Message in DB
    const message = await this.messageService.createMessage(body, client.user);

    message.sender = client.user;

    this.logger.info({ clientId: client.id, content: body.content }, 'Client Sent New Message');

    // Boradcast Messages
    this.server.to(body.roomId).emit(`receiveMessage`, message);
  }

  async notifyInvitation(
    roomId: string,
    inviter: User,
    newMembers: ChatRoomMember[],
    systemMessage: Message
  ) {
    for (const member of newMembers) {
      this.server.to(`user:${member.userId}`).emit('chatroom:invited', {
        roomId,
        inviter: inviter.username,
      });
    }

    this.server.to(roomId).emit('chatroom:system', systemMessage.content);
  }

  async notifyDirectMessage(roomId: string, inviter: User, friend: User, systemMessage: Message) {
    this.server.to(`user:${friend.id}`).emit(`dm:invited`, {
      roomId,
      inviter: inviter.username,
    });

    this.server.to(roomId).emit('dm:system', systemMessage.content);
  }
}
