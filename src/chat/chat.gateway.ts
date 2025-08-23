import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server } from 'http';
import { Socket } from 'socket.io';
import { PinoLogger } from 'nestjs-pino';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/entity/user.entity';

@WebSocketGateway({ namespace: 'chats' })
export class ChatGateway implements OnGatewayConnection {
  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly logger: PinoLogger
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket & { user: User }) {
    this.logger.info({ clientId: client.id }, 'Connection request received');

    const authHeader = client.handshake.headers.authorization;

    if (!authHeader) {
      client.disconnect();
      throw new WsException('Authorization Header is missing');
    }

    try {
      const token = this.authService.extractTokenFromHeader(authHeader, 'bearer');
      const payload = this.authService.verifyToken(token);
      const user = await this.userService.getUserByEmail(payload.email);

      client.user = user;

      this.logger.info({ clientId: client.id }, 'Client connection established');

      return true;
    } catch (err) {
      client.disconnect();

      this.logger.warn({ clientId: client.id }, 'Client connection failed');

      throw new WsException(err.message || 'WebSocket Connection Authentication Error');
    }
  }
}
