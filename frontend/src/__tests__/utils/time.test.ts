import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatTime,
  formatSeconds,
  getTimeRemaining,
  formatKoreanDate,
  formatKoreanDateTime,
  getRelativeTime,
} from "@/utils/time";

describe("formatTime", () => {
  it("0 또는 음수일 때 00:00:00을 반환한다", () => {
    expect(formatTime(0)).toBe("00:00:00");
    expect(formatTime(-1000)).toBe("00:00:00");
    expect(formatTime(-999999)).toBe("00:00:00");
  });

  it("밀리초를 HH:MM:SS 형식으로 변환한다", () => {
    expect(formatTime(1000)).toBe("00:00:01");
    expect(formatTime(60000)).toBe("00:01:00");
    expect(formatTime(3600000)).toBe("01:00:00");
    expect(formatTime(3661000)).toBe("01:01:01");
  });

  it("큰 값도 올바르게 처리한다", () => {
    expect(formatTime(86400000)).toBe("24:00:00");
    expect(formatTime(90061000)).toBe("25:01:01");
  });

  it("두 자릿수로 패딩한다", () => {
    expect(formatTime(5000)).toBe("00:00:05");
    expect(formatTime(540000)).toBe("00:09:00");
  });
});

describe("formatSeconds", () => {
  it("0 또는 음수일 때 00:00을 반환한다", () => {
    expect(formatSeconds(0)).toBe("00:00");
    expect(formatSeconds(-10)).toBe("00:00");
    expect(formatSeconds(-999)).toBe("00:00");
  });

  it("초를 MM:SS 형식으로 변환한다", () => {
    expect(formatSeconds(1)).toBe("00:01");
    expect(formatSeconds(60)).toBe("01:00");
    expect(formatSeconds(61)).toBe("01:01");
    expect(formatSeconds(125)).toBe("02:05");
  });

  it("60분 이상도 올바르게 처리한다", () => {
    expect(formatSeconds(3600)).toBe("60:00");
    expect(formatSeconds(3661)).toBe("61:01");
  });
});

describe("getTimeRemaining", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("종료된 시간일 때 종료됨을 반환한다", () => {
    const now = new Date("2024-01-01T12:00:00");
    vi.setSystemTime(now);

    const pastTime = new Date("2024-01-01T11:00:00");
    const result = getTimeRemaining(pastTime);

    expect(result.text).toBe("종료됨");
    expect(result.isUrgent).toBe(false);
    expect(result.isExpired).toBe(true);
  });

  it("1시간 미만 남았을 때 긴급 상태를 반환한다", () => {
    const now = new Date("2024-01-01T12:00:00");
    vi.setSystemTime(now);

    const futureTime = new Date("2024-01-01T12:30:00");
    const result = getTimeRemaining(futureTime);

    expect(result.text).toBe("30분 남음");
    expect(result.isUrgent).toBe(true);
    expect(result.isExpired).toBe(false);
  });

  it("1시간 이상 24시간 미만 남았을 때 시간/분 형식을 반환한다", () => {
    const now = new Date("2024-01-01T12:00:00");
    vi.setSystemTime(now);

    const futureTime = new Date("2024-01-01T14:30:00");
    const result = getTimeRemaining(futureTime);

    expect(result.text).toBe("2시간 30분 남음");
    expect(result.isUrgent).toBe(false);
    expect(result.isExpired).toBe(false);
  });

  it("24시간 이상 남았을 때 일 단위를 반환한다", () => {
    const now = new Date("2024-01-01T12:00:00");
    vi.setSystemTime(now);

    const futureTime = new Date("2024-01-03T12:00:00");
    const result = getTimeRemaining(futureTime);

    expect(result.text).toBe("2일 남음");
    expect(result.isUrgent).toBe(false);
    expect(result.isExpired).toBe(false);
  });

  it("정확히 1시간 남았을 때 긴급 상태가 아니다", () => {
    const now = new Date("2024-01-01T12:00:00");
    vi.setSystemTime(now);

    const futureTime = new Date("2024-01-01T13:00:00");
    const result = getTimeRemaining(futureTime);

    expect(result.text).toBe("1시간 0분 남음");
    expect(result.isUrgent).toBe(false);
  });

  it("문자열 날짜도 처리한다", () => {
    const now = new Date("2024-01-01T12:00:00");
    vi.setSystemTime(now);

    const result = getTimeRemaining("2024-01-01T12:30:00");
    expect(result.text).toBe("30분 남음");
  });
});

describe("formatKoreanDate", () => {
  it("Date 객체를 한국어 날짜 형식으로 변환한다", () => {
    const date = new Date("2024-01-15");
    const result = formatKoreanDate(date);

    expect(result).toMatch(/2024/);
    expect(result).toMatch(/1/);
    expect(result).toMatch(/15/);
  });

  it("문자열 날짜도 처리한다", () => {
    const result = formatKoreanDate("2024-12-25");

    expect(result).toMatch(/2024/);
    expect(result).toMatch(/12/);
    expect(result).toMatch(/25/);
  });
});

describe("formatKoreanDateTime", () => {
  it("Date 객체를 한국어 날짜+시간 형식으로 변환한다", () => {
    const date = new Date("2024-01-15T14:30:00");
    const result = formatKoreanDateTime(date);

    expect(result).toMatch(/2024/);
    expect(result).toMatch(/1/);
    expect(result).toMatch(/15/);
  });

  it("문자열 날짜도 처리한다", () => {
    const result = formatKoreanDateTime("2024-12-25T10:30:00");

    expect(result).toMatch(/2024/);
    expect(result).toMatch(/12/);
    expect(result).toMatch(/25/);
  });
});

describe("getRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1분 미만일 때 '방금 전'을 반환한다", () => {
    const now = new Date("2024-01-01T12:00:00");
    vi.setSystemTime(now);

    const recent = new Date("2024-01-01T11:59:30");
    expect(getRelativeTime(recent)).toBe("방금 전");
  });

  it("1분 이상 60분 미만일 때 'N분 전'을 반환한다", () => {
    const now = new Date("2024-01-01T12:00:00");
    vi.setSystemTime(now);

    expect(getRelativeTime(new Date("2024-01-01T11:55:00"))).toBe("5분 전");
    expect(getRelativeTime(new Date("2024-01-01T11:30:00"))).toBe("30분 전");
  });

  it("1시간 이상 24시간 미만일 때 'N시간 전'을 반환한다", () => {
    const now = new Date("2024-01-01T12:00:00");
    vi.setSystemTime(now);

    expect(getRelativeTime(new Date("2024-01-01T10:00:00"))).toBe("2시간 전");
    expect(getRelativeTime(new Date("2024-01-01T00:00:00"))).toBe("12시간 전");
  });

  it("1일 이상 7일 미만일 때 'N일 전'을 반환한다", () => {
    const now = new Date("2024-01-07T12:00:00");
    vi.setSystemTime(now);

    expect(getRelativeTime(new Date("2024-01-05T12:00:00"))).toBe("2일 전");
    expect(getRelativeTime(new Date("2024-01-01T12:00:00"))).toBe("6일 전");
  });

  it("7일 이상일 때 한국어 날짜 형식을 반환한다", () => {
    const now = new Date("2024-01-15T12:00:00");
    vi.setSystemTime(now);

    const result = getRelativeTime(new Date("2024-01-01T12:00:00"));

    expect(result).toMatch(/2024/);
    expect(result).toMatch(/1/);
  });

  it("문자열 날짜도 처리한다", () => {
    const now = new Date("2024-01-01T12:00:00");
    vi.setSystemTime(now);

    expect(getRelativeTime("2024-01-01T11:55:00")).toBe("5분 전");
  });
});
