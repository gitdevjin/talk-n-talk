import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, from, mergeMap, Observable } from 'rxjs';
import { DataSource } from 'typeorm';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    req.queryRunner = queryRunner;

    return next.handle().pipe(
      catchError((err) =>
        from(
          (async () => {
            await queryRunner.rollbackTransaction();
            await queryRunner.release();
            if (err instanceof HttpException) {
              throw err; // rethrow as-is
            }
            throw new InternalServerErrorException(err.message);
          })()
        )
      ),
      mergeMap((value) =>
        from(
          (async () => {
            await queryRunner.commitTransaction();
            await queryRunner.release();
            return value; // preserve the response value
          })()
        )
      )
    );
  }
}
