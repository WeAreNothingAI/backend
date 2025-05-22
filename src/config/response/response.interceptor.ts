import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseResponse, SuccessResponse, ErrorResponse } from './response.dto';
import { ResponseCode } from './response-code.enum';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, BaseResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<BaseResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof BaseResponse) {
          return data;
        }
        return SuccessResponse.create(data);
      }),
      catchError((error) => {
        if (error instanceof HttpException) {
          const status = error.getStatus();
          const message = error.message;

          let code: ResponseCode;
          switch (status) {
            case HttpStatus.UNAUTHORIZED:
              code = ResponseCode.AUTH_UNAUTHORIZED;
              break;
            case HttpStatus.FORBIDDEN:
              code = ResponseCode.AUTH_FORBIDDEN;
              break;
            case HttpStatus.BAD_REQUEST:
              code = ResponseCode.VALIDATION_ERROR;
              break;
            default:
              code = ResponseCode.SERVER_ERROR;
          }

          return throwError(() => ErrorResponse.create(code, message));
        }

        return throwError(() =>
          ErrorResponse.create(ResponseCode.SERVER_ERROR, error.message),
        );
      }),
    );
  }
}
