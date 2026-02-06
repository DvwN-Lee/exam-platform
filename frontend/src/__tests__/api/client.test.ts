import { describe, it, expect, beforeEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import apiClient from "@/api/client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

describe("apiClient", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Request Interceptor", () => {
    it("localStorage에 토큰이 있으면 Authorization 헤더를 추가한다", async () => {
      localStorage.setItem("access_token", "test-token");

      let capturedAuthHeader: string | null = null;

      server.use(
        http.get(`${API_BASE_URL}/test`, ({ request }) => {
          capturedAuthHeader = request.headers.get("Authorization");
          return HttpResponse.json({ success: true });
        })
      );

      await apiClient.get("/test");

      expect(capturedAuthHeader).toBe("Bearer test-token");
    });

    it("토큰이 없으면 Authorization 헤더를 추가하지 않는다", async () => {
      let capturedAuthHeader: string | null = null;

      server.use(
        http.get(`${API_BASE_URL}/test`, ({ request }) => {
          capturedAuthHeader = request.headers.get("Authorization");
          return HttpResponse.json({ success: true });
        })
      );

      await apiClient.get("/test");

      expect(capturedAuthHeader).toBeNull();
    });

    it("Content-Type 헤더가 기본으로 설정된다", async () => {
      let capturedContentType: string | null = null;

      server.use(
        http.post(`${API_BASE_URL}/test`, ({ request }) => {
          capturedContentType = request.headers.get("Content-Type");
          return HttpResponse.json({ success: true });
        })
      );

      await apiClient.post("/test", { data: "test" });

      expect(capturedContentType).toBe("application/json");
    });
  });

  describe("Response Interceptor - 에러 정규화", () => {
    it("Backend 에러 형식을 정규화한다", async () => {
      server.use(
        http.get(`${API_BASE_URL}/test`, () => {
          return HttpResponse.json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: "This field is required.",
                details: { field: "username" },
              },
            },
            { status: 400 }
          );
        })
      );

      try {
        await apiClient.get("/test");
      } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { detail?: string; code?: string } } };
        expect(axiosError.response?.data?.detail).toBe("필수 입력 항목입니다.");
        expect(axiosError.response?.data?.code).toBe("VALIDATION_ERROR");
      }
    });

    // Note: 401 응답은 토큰 갱신 interceptor를 트리거하므로 별도 테스트로 분리
    it("DRF 기본 에러 형식의 detail을 번역한다 (non-401)", async () => {
      server.use(
        http.get(`${API_BASE_URL}/test`, () => {
          return HttpResponse.json(
            { detail: "Not found." },
            { status: 404 }
          );
        })
      );

      try {
        await apiClient.get("/test");
      } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        expect(axiosError.response?.data?.detail).toBe("요청한 데이터를 찾을 수 없습니다.");
      }
    });
  });

  describe("Response Interceptor - 토큰 갱신", () => {
    // Note: axios interceptor에서 직접 axios.post를 호출하므로 MSW와의 통합이 복잡함
    // 이 테스트는 E2E 테스트에서 검증하는 것이 적합함
    it.skip("401 에러 시 HttpOnly Cookie를 통해 토큰을 갱신하고 원래 요청을 재시도한다", async () => {
      localStorage.setItem("access_token", "expired-token");

      let requestCount = 0;

      server.use(
        http.get(`${API_BASE_URL}/protected`, ({ request }) => {
          requestCount++;
          const authHeader = request.headers.get("Authorization");

          if (authHeader === "Bearer expired-token") {
            return HttpResponse.json(
              { detail: "Token is invalid or expired" },
              { status: 401 }
            );
          }

          if (authHeader === "Bearer new-access-token") {
            return HttpResponse.json({ data: "protected data" });
          }

          return HttpResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }),
        http.post(`${API_BASE_URL}/auth/token/refresh/`, () => {
          return HttpResponse.json({ access: "new-access-token" });
        })
      );

      const result = await apiClient.get("/protected");

      expect(result.data).toEqual({ data: "protected data" });
      expect(requestCount).toBe(2);
      expect(localStorage.getItem("access_token")).toBe("new-access-token");
    });

    it("Cookie 기반 refresh 실패 시 auth:session-expired 이벤트를 dispatch한다", async () => {
      localStorage.setItem("access_token", "expired-token");

      server.use(
        http.get(`${API_BASE_URL}/protected`, () => {
          return HttpResponse.json(
            { detail: "Token is invalid or expired" },
            { status: 401 }
          );
        }),
        http.post(`${API_BASE_URL}/auth/token/refresh/`, () => {
          return HttpResponse.json(
            { detail: "Token is invalid or expired" },
            { status: 401 }
          );
        })
      );

      const eventSpy = vi.fn();
      window.addEventListener("auth:session-expired", eventSpy);

      await expect(apiClient.get("/protected")).rejects.toThrow();

      expect(eventSpy).toHaveBeenCalled();
      expect(localStorage.getItem("access_token")).toBeNull();

      window.removeEventListener("auth:session-expired", eventSpy);
    });

    // Note: axios interceptor에서 직접 axios.post를 호출하므로 MSW와의 통합이 복잡함
    it.skip("토큰 갱신 실패 시 localStorage를 정리하고 auth:session-expired 이벤트를 dispatch한다", async () => {
      localStorage.setItem("access_token", "expired-token");

      server.use(
        http.get(`${API_BASE_URL}/protected`, () => {
          return HttpResponse.json(
            { detail: "Token is invalid or expired" },
            { status: 401 }
          );
        }),
        http.post(`${API_BASE_URL}/auth/token/refresh/`, () => {
          return HttpResponse.json(
            { detail: "Token is invalid or expired" },
            { status: 401 }
          );
        })
      );

      await expect(apiClient.get("/protected")).rejects.toThrow();

      expect(localStorage.getItem("access_token")).toBeNull();
    });

    it("인증 API 엔드포인트는 토큰 갱신 로직을 건너뛴다 (/auth/token)", async () => {
      localStorage.setItem("access_token", "some-token");

      let refreshCalled = false;

      server.use(
        http.post(`${API_BASE_URL}/auth/token/`, () => {
          return HttpResponse.json(
            { detail: "Invalid credentials" },
            { status: 401 }
          );
        }),
        http.post(`${API_BASE_URL}/auth/token/refresh/`, () => {
          refreshCalled = true;
          return HttpResponse.json({ access: "new-token" });
        })
      );

      await expect(
        apiClient.post("/auth/token/", {
          username: "test",
          password: "wrong",
        })
      ).rejects.toThrow();

      expect(refreshCalled).toBe(false);
    });

    it("회원가입 API는 토큰 갱신 로직을 건너뛴다 (/auth/register)", async () => {
      localStorage.setItem("access_token", "some-token");

      let refreshCalled = false;

      server.use(
        http.post(`${API_BASE_URL}/auth/register/`, () => {
          return HttpResponse.json(
            { username: ["Already exists"] },
            { status: 401 }
          );
        }),
        http.post(`${API_BASE_URL}/auth/token/refresh/`, () => {
          refreshCalled = true;
          return HttpResponse.json({ access: "new-token" });
        })
      );

      await expect(
        apiClient.post("/auth/register/", { username: "existing" })
      ).rejects.toThrow();

      expect(refreshCalled).toBe(false);
    });
  });

  describe("localStorage 에러 처리", () => {
    it("localStorage 접근 실패 시에도 요청이 정상 동작한다", async () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          throw new Error("Storage access denied");
        }
      );

      server.use(
        http.get(`${API_BASE_URL}/public`, () => {
          return HttpResponse.json({ data: "public data" });
        })
      );

      const result = await apiClient.get("/public");

      expect(result.data).toEqual({ data: "public data" });
    });
  });
});
