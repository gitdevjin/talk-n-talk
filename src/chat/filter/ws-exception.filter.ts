import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

@Catch()
export class WsExecptionFilter extends BaseWsExceptionFilter {
  catch(exception: any, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient();

    let response;

    if (exception instanceof WsException) {
      response = exception.getError();
    } else if (exception instanceof HttpException) {
      response = exception.getResponse();
    } else {
      response = { message: exception.message || 'Internal server error' };
    }

    if (typeof response === 'string') {
      response = { message: response };
    }

    client.emit('exception', { data: response });
  }
}
