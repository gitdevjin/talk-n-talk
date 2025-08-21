import { OnGatewayConnection, WebSocketGateway } from '@nestjs/websockets';
import { ChatService } from './chat.service';

@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection {
  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: any, ...args: any[]) {}
}
