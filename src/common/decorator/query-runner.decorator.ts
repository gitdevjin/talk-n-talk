import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';

export const TxQueryRunner = createParamDecorator((data, context: ExecutionContext) => {
  const req = context.switchToHttp().getRequest();

  if (!req.queryRunner) {
    throw new InternalServerErrorException(
      'QueryRunner was not found on the request. Ensure that the Transaction Interceptor is applied.'
    );
  }

  return req.queryRunner;
});
