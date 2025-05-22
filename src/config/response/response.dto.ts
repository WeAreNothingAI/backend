import { ResponseCode } from './response-code.enum';
import { ResponseMessage } from './response-message.constant';

export interface IResponse<T = any> {
  isSuccess: boolean;
  code: ResponseCode;
  message: string;
  result?: T;
}

// 기본 응답
export abstract class BaseResponse<T = any> implements IResponse<T> {
  readonly isSuccess: boolean;
  readonly code: ResponseCode;
  readonly message: string;
  readonly result?: T;

  protected constructor(code: ResponseCode, message: string, result?: T) {
    this.isSuccess = code === ResponseCode.SUCCESS;
    this.code = code;
    this.message = message;
    if (result !== undefined) {
      this.result = result;
    }
  }

  toJSON(): IResponse<T> {
    const response: IResponse<T> = {
      isSuccess: this.isSuccess,
      code: this.code,
      message: this.message,
    };

    if (this.result !== undefined) {
      response.result = this.result;
    }

    return response;
  }
}

// 성공
export class SuccessResponse<T = any> extends BaseResponse<T> {
  constructor(result?: T) {
    super(ResponseCode.SUCCESS, ResponseMessage.SUCCESS, result);
  }

  static create<T>(result?: T): SuccessResponse<T> {
    return new SuccessResponse(result);
  }
}

// 실패
export class ErrorResponse extends BaseResponse {
  constructor(code: ResponseCode, message: string) {
    super(code, message);
  }

  static create(code: ResponseCode, message: string): ErrorResponse {
    return new ErrorResponse(code, message);
  }

  static validation(message: string): ErrorResponse {
    return new ErrorResponse(ResponseCode.VALIDATION_ERROR, message);
  }

  static unauthorized(
    message: string = ResponseMessage.AUTH_UNAUTHORIZED,
  ): ErrorResponse {
    return new ErrorResponse(ResponseCode.AUTH_UNAUTHORIZED, message);
  }

  static forbidden(
    message: string = ResponseMessage.AUTH_FORBIDDEN,
  ): ErrorResponse {
    return new ErrorResponse(ResponseCode.AUTH_FORBIDDEN, message);
  }

  static serverError(
    message: string = ResponseMessage.SERVER_ERROR,
  ): ErrorResponse {
    return new ErrorResponse(ResponseCode.SERVER_ERROR, message);
  }

  static dbError(message: string = ResponseMessage.DB_ERROR): ErrorResponse {
    return new ErrorResponse(ResponseCode.DB_ERROR, message);
  }

  static externalServiceError(
    message: string = ResponseMessage.EXTERNAL_SERVICE_ERROR,
  ): ErrorResponse {
    return new ErrorResponse(ResponseCode.EXTERNAL_SERVICE_ERROR, message);
  }
}
