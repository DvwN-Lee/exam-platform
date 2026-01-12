import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("단일 클래스를 반환한다", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("여러 클래스를 병합한다", () => {
    expect(cn("text-red-500", "bg-blue-500")).toBe("text-red-500 bg-blue-500");
  });

  it("조건부 클래스를 처리한다", () => {
    expect(cn("base", true && "active")).toBe("base active");
    expect(cn("base", false && "active")).toBe("base");
  });

  it("undefined와 null을 무시한다", () => {
    expect(cn("base", undefined, null, "active")).toBe("base active");
  });

  it("빈 문자열을 무시한다", () => {
    expect(cn("base", "", "active")).toBe("base active");
  });

  it("Tailwind 클래스 충돌을 해결한다", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("mt-4", "mt-8")).toBe("mt-8");
  });

  it("객체 형식의 조건부 클래스를 처리한다", () => {
    expect(cn({ "text-red-500": true, "bg-blue-500": false })).toBe(
      "text-red-500"
    );
  });

  it("배열 형식의 클래스를 처리한다", () => {
    expect(cn(["text-red-500", "bg-blue-500"])).toBe("text-red-500 bg-blue-500");
  });

  it("복합 입력을 처리한다", () => {
    const isActive = true;
    const isDisabled = false;

    expect(
      cn(
        "base-class",
        isActive && "active",
        isDisabled && "disabled",
        { "hover:bg-gray-100": true },
        ["flex", "items-center"]
      )
    ).toBe("base-class active hover:bg-gray-100 flex items-center");
  });

  it("인자가 없을 때 빈 문자열을 반환한다", () => {
    expect(cn()).toBe("");
  });

  it("모든 인자가 falsy일 때 빈 문자열을 반환한다", () => {
    expect(cn(false, null, undefined, "")).toBe("");
  });
});
