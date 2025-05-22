export const ResponseMessage = {
  // Success
  SUCCESS: '성공',

  // Common
  TOKEN_EMPTY: 'JWT 토큰을 입력해주세요.',
  TOKEN_VERIFICATION_FAILURE: 'JWT 토큰 검증에 실패했습니다.',
  TOKEN_VERIFICATION_SUCCESS: 'JWT 토큰 검증에 성공했습니다.',

  // Validation
  VALIDATION_ERROR: '입력값이 유효하지 않습니다.',
  MISSING_REQUIRED_FIELD: '필수 입력값이 누락되었습니다.',
  INVALID_INPUT: '잘못된 입력값입니다.',

  // Auth
  AUTH_UNAUTHORIZED: '인증이 필요합니다.',
  AUTH_FORBIDDEN: '접근 권한이 없습니다.',
  AUTH_INVALID_CREDENTIALS: '아이디 또는 비밀번호가 일치하지 않습니다.',
  AUTH_ACCOUNT_INACTIVE: '비활성화된 계정입니다. 고객센터에 문의해주세요.',
  AUTH_ACCOUNT_WITHDRAWN: '탈퇴된 계정입니다. 고객센터에 문의해주세요.',

  // Server
  DB_ERROR: '데이터베이스 오류가 발생했습니다.',
  SERVER_ERROR: '서버 오류가 발생했습니다.',
  EXTERNAL_SERVICE_ERROR: '외부 서비스 연동 중 오류가 발생했습니다.',
} as const; 