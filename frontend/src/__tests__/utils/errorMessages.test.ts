import { describe, it, expect } from "vitest";
import { translateErrorMessage, ERROR_MESSAGES } from "@/utils/errorMessages";

describe("translateErrorMessage", () => {
  describe("인증 관련 메시지", () => {
    it("잘못된 자격 증명 메시지를 번역한다", () => {
      expect(
        translateErrorMessage(
          "No active account found with the given credentials"
        )
      ).toBe("아이디 또는 비밀번호가 올바르지 않습니다.");
    });

    it("로그인 실패 메시지를 번역한다", () => {
      expect(
        translateErrorMessage("Unable to log in with provided credentials.")
      ).toBe("아이디 또는 비밀번호가 올바르지 않습니다.");
    });

    it("비활성화된 계정 메시지를 번역한다", () => {
      expect(translateErrorMessage("User account is disabled.")).toBe(
        "비활성화된 계정입니다."
      );
    });

    it("만료된 토큰 메시지를 번역한다", () => {
      expect(translateErrorMessage("Token is invalid or expired")).toBe(
        "인증이 만료되었습니다. 다시 로그인해주세요."
      );
    });

    it("블랙리스트 토큰 메시지를 번역한다", () => {
      expect(translateErrorMessage("Token is blacklisted")).toBe(
        "로그아웃된 토큰입니다. 다시 로그인해주세요."
      );
    });

    it("유효하지 않은 토큰 메시지를 번역한다", () => {
      expect(
        translateErrorMessage("Given token not valid for any token type")
      ).toBe("유효하지 않은 토큰입니다. 다시 로그인해주세요.");
    });
  });

  describe("유효성 검사 메시지", () => {
    it("필수 필드 메시지를 번역한다", () => {
      expect(translateErrorMessage("This field is required.")).toBe(
        "필수 입력 항목입니다."
      );
    });

    it("빈 필드 메시지를 번역한다", () => {
      expect(translateErrorMessage("This field may not be blank.")).toBe(
        "필수 입력 항목입니다."
      );
    });

    it("이메일 형식 메시지를 번역한다", () => {
      expect(translateErrorMessage("Enter a valid email address.")).toBe(
        "올바른 이메일 주소를 입력해주세요."
      );
    });

    it("최대 글자수 메시지를 번역한다", () => {
      expect(
        translateErrorMessage(
          "Ensure this field has no more than {max_length} characters."
        )
      ).toBe("최대 글자 수를 초과했습니다.");
    });

    it("최소 글자수 메시지를 번역한다", () => {
      expect(
        translateErrorMessage(
          "Ensure this field has at least {min_length} characters."
        )
      ).toBe("최소 글자 수를 충족하지 않습니다.");
    });
  });

  describe("권한 관련 메시지", () => {
    it("인증 필요 메시지를 번역한다", () => {
      expect(
        translateErrorMessage(
          "Authentication credentials were not provided."
        )
      ).toBe("로그인이 필요합니다.");
    });

    it("권한 없음 메시지를 번역한다", () => {
      expect(
        translateErrorMessage(
          "You do not have permission to perform this action."
        )
      ).toBe("이 작업을 수행할 권한이 없습니다.");
    });
  });

  describe("리소스 관련 메시지", () => {
    it("찾을 수 없음 메시지를 번역한다", () => {
      expect(translateErrorMessage("Not found.")).toBe(
        "요청한 데이터를 찾을 수 없습니다."
      );
    });

    it("서버 오류 메시지를 번역한다", () => {
      expect(translateErrorMessage("A server error occurred.")).toBe(
        "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    });
  });

  describe("매핑되지 않은 메시지", () => {
    it("알 수 없는 메시지는 원문 그대로 반환한다", () => {
      expect(translateErrorMessage("Unknown error message")).toBe(
        "Unknown error message"
      );
    });

    it("빈 문자열은 빈 문자열을 반환한다", () => {
      expect(translateErrorMessage("")).toBe("");
    });

    it("한글 메시지는 그대로 반환한다", () => {
      expect(translateErrorMessage("이미 한글 메시지입니다.")).toBe(
        "이미 한글 메시지입니다."
      );
    });
  });
});

describe("ERROR_MESSAGES 상수", () => {
  it("모든 예상 키가 존재한다", () => {
    const expectedKeys = [
      "No active account found with the given credentials",
      "Unable to log in with provided credentials.",
      "User account is disabled.",
      "Token is invalid or expired",
      "Token is blacklisted",
      "Given token not valid for any token type",
      "This field is required.",
      "This field may not be blank.",
      "Enter a valid email address.",
      "Authentication credentials were not provided.",
      "You do not have permission to perform this action.",
      "Not found.",
      "A server error occurred.",
    ];

    expectedKeys.forEach((key) => {
      expect(ERROR_MESSAGES).toHaveProperty(key);
    });
  });

  it("모든 값이 한글 문자열이다", () => {
    Object.values(ERROR_MESSAGES).forEach((value) => {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    });
  });
});
