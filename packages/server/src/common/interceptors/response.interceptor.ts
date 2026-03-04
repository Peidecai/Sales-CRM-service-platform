import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseData<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseData<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseData<T>> {
    return next.handle().pipe(
      map((data) => {
        // If already wrapped in our format, don't wrap again
        if (
          data !== null &&
          typeof data === 'object' &&
          'code' in data &&
          'message' in data &&
          'data' in data
        ) {
          return data as ResponseData<T>;
        }

        return {
          code: 0,
          message: 'success',
          data,
        };
      }),
    );
  }
}
