import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import {
  isAxiosError,
  getErrorMessage,
  getFieldErrorMessage,
} from "@/utils/error";

function createAxiosError(
  data: unknown,
  status: number = 400
): AxiosError<unknown> {
  const error = new AxiosError("Request failed");
  error.response = {
    data,
    status,
    statusText: "Bad Request",
    headers: {},
    config: {
      headers: new AxiosHeaders(),
    },
  };
  return error;
}

describe("isAxiosError", () => {
  it("AxiosError 객체를 올바르게 식별한다", () => {
    const axiosError = new AxiosError("Test error");
    expect(isAxiosError(axiosError)).toBe(true);
  });

  it("일반 Error 객체는 false를 반환한다", () => {
    const error = new Error("Test error");
    expect(isAxiosError(error)).toBe(false);
  });

  it("null은 false를 반환한다", () => {
    expect(isAxiosError(null)).toBe(false);
  });

  it("undefined는 false를 반환한다", () => {
    expect(isAxiosError(undefined)).toBe(false);
  });

  it("문자열은 false를 반환한다", () => {
    expect(isAxiosError("error")).toBe(false);
  });

  it("isAxiosError 속성이 없는 객체는 false를 반환한다", () => {
    expect(isAxiosError({ message: "error" })).toBe(false);
  });

  it("isAxiosError가 false인 객체는 false를 반환한다", () => {
    expect(isAxiosError({ isAxiosError: false })).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("AxiosError의 detail 필드를 반환한다", () => {
    const error = createAxiosError({
      detail: "No active account found with the given credentials",
    });
    const result = getErrorMessage(error);

    expect(result).toBe("아이디 또는 비밀번호가 올바르지 않습니다.");
  });

  it("AxiosError의 message 필드를 반환한다", () => {
    const error = createAxiosError({
      message: "Authentication credentials were not provided.",
    });
    const result = getErrorMessage(error);

    expect(result).toBe("로그인이 필요합니다.");
  });

  it("message가 detail보다 우선한다", () => {
    const error = createAxiosError({
      message: "This field is required.",
      detail: "Not found.",
    });
    const result = getErrorMessage(error);

    expect(result).toBe("필수 입력 항목입니다.");
  });

  it("응답 데이터가 없을 때 기본 메시지를 반환한다", () => {
    const error = new AxiosError("Network error");
    const result = getErrorMessage(error);

    expect(result).toBe("요청에 실패했습니다.");
  });

  it("커스텀 기본 메시지를 사용할 수 있다", () => {
    const error = new AxiosError("Network error");
    const result = getErrorMessage(error, "네트워크 오류가 발생했습니다.");

    expect(result).toBe("네트워크 오류가 발생했습니다.");
  });

  it("일반 Error 객체의 메시지를 반환한다", () => {
    const error = new Error("This field is required.");
    const result = getErrorMessage(error);

    expect(result).toBe("필수 입력 항목입니다.");
  });

  it("알 수 없는 에러 타입일 때 기본 메시지를 반환한다", () => {
    const result = getErrorMessage("unknown error");

    expect(result).toBe("요청에 실패했습니다.");
  });

  it("null 에러일 때 기본 메시지를 반환한다", () => {
    const result = getErrorMessage(null);

    expect(result).toBe("요청에 실패했습니다.");
  });

  it("매핑되지 않은 영문 메시지는 그대로 반환한다", () => {
    const error = createAxiosError({
      detail: "Custom error message",
    });
    const result = getErrorMessage(error);

    expect(result).toBe("Custom error message");
  });
});

describe("getFieldErrorMessage", () => {
  it("배열 형태의 필드 에러를 반환한다", () => {
    const error = createAxiosError({
      old_password: ["This field is required."],
    });
    const result = getFieldErrorMessage(error, "old_password", "기본 메시지");

    expect(result).toBe("필수 입력 항목입니다.");
  });

  it("여러 에러 중 첫 번째를 반환한다", () => {
    const error = createAxiosError({
      email: [
        "This field is required.",
        "Enter a valid email address.",
      ],
    });
    const result = getFieldErrorMessage(error, "email", "기본 메시지");

    expect(result).toBe("필수 입력 항목입니다.");
  });

  it("빈 배열일 때 detail 필드를 반환한다", () => {
    const error = createAxiosError({
      username: [],
      detail: "Not found.",
    });
    const result = getFieldErrorMessage(error, "username", "기본 메시지");

    expect(result).toBe("요청한 데이터를 찾을 수 없습니다.");
  });

  it("필드가 없을 때 detail 필드를 반환한다", () => {
    const error = createAxiosError({
      detail: "Authentication credentials were not provided.",
    });
    const result = getFieldErrorMessage(error, "nonexistent", "기본 메시지");

    expect(result).toBe("로그인이 필요합니다.");
  });

  it("필드와 detail 모두 없을 때 기본 메시지를 반환한다", () => {
    const error = createAxiosError({});
    const result = getFieldErrorMessage(error, "field", "기본 메시지");

    expect(result).toBe("기본 메시지");
  });

  it("AxiosError가 아닐 때 기본 메시지를 반환한다", () => {
    const error = new Error("Some error");
    const result = getFieldErrorMessage(error, "field", "기본 메시지");

    expect(result).toBe("기본 메시지");
  });

  it("null일 때 기본 메시지를 반환한다", () => {
    const result = getFieldErrorMessage(null, "field", "기본 메시지");

    expect(result).toBe("기본 메시지");
  });

  it("필드 값이 배열이 아닐 때 detail을 확인한다", () => {
    const error = createAxiosError({
      username: "not an array",
      detail: "Not found.",
    });
    const result = getFieldErrorMessage(error, "username", "기본 메시지");

    expect(result).toBe("요청한 데이터를 찾을 수 없습니다.");
  });
});
