/**
 * Backend 영문 에러 메시지를 한글로 매핑
 * Django SimpleJWT 및 DRF 기본 메시지 포함
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // 인증 관련
  'No active account found with the given credentials':
    '아이디 또는 비밀번호가 올바르지 않습니다.',
  'Unable to log in with provided credentials.':
    '아이디 또는 비밀번호가 올바르지 않습니다.',
  'User account is disabled.': '비활성화된 계정입니다.',
  'Token is invalid or expired':
    '인증이 만료되었습니다. 다시 로그인해주세요.',
  'Token is blacklisted':
    '로그아웃된 토큰입니다. 다시 로그인해주세요.',
  'Given token not valid for any token type':
    '유효하지 않은 토큰입니다. 다시 로그인해주세요.',

  // 유효성 검사
  'This field is required.': '필수 입력 항목입니다.',
  'This field may not be blank.': '필수 입력 항목입니다.',
  'Enter a valid email address.': '올바른 이메일 주소를 입력해주세요.',
  'Ensure this field has no more than {max_length} characters.':
    '최대 글자 수를 초과했습니다.',
  'Ensure this field has at least {min_length} characters.':
    '최소 글자 수를 충족하지 않습니다.',

  // 권한 관련
  'Authentication credentials were not provided.': '로그인이 필요합니다.',
  'You do not have permission to perform this action.':
    '이 작업을 수행할 권한이 없습니다.',

  // 리소스 관련
  'Not found.': '요청한 데이터를 찾을 수 없습니다.',
  'A server error occurred.':
    '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

/**
 * 영문 에러 메시지를 한글로 변환
 * 매핑되지 않은 메시지는 원문 그대로 반환
 */
export function translateErrorMessage(message: string): string {
  return ERROR_MESSAGES[message] || message
}
