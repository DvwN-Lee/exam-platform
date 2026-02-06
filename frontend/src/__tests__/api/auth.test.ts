import { describe, it, expect, beforeEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { authApi } from "@/api/auth";
import type { User } from "@/types/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const mockUser: User = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  nick_name: "Test User",
  gender: "male",
  mobile: "010-1234-5678",
  user_type: "student",
  age: 20,
  image: "/default-avatar.png",
  created_at: "2024-01-01T00:00:00Z",
};

describe("authApi", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("올바른 자격 증명으로 로그인에 성공한다", async () => {
      server.use(
        http.post(`${API_BASE_URL}/auth/token/`, () => {
          return HttpResponse.json({
            access: "mock-access-token",
            user: mockUser,
          });
        })
      );

      const result = await authApi.login({
        username: "testuser",
        password: "password123",
      });

      expect(result.access).toBe("mock-access-token");
      expect(result.user).toEqual(mockUser);
    });

    it("잘못된 자격 증명으로 로그인에 실패한다", async () => {
      server.use(
        http.post(`${API_BASE_URL}/auth/token/`, () => {
          return HttpResponse.json(
            { detail: "No active account found with the given credentials" },
            { status: 401 }
          );
        })
      );

      await expect(
        authApi.login({
          username: "wronguser",
          password: "wrongpassword",
        })
      ).rejects.toThrow();
    });
  });

  describe("register", () => {
    it("회원가입에 성공한다", async () => {
      server.use(
        http.post(`${API_BASE_URL}/auth/register/`, () => {
          return HttpResponse.json(
            {
              user: mockUser,
              message: "Registration successful",
            },
            { status: 201 }
          );
        })
      );

      const result = await authApi.register({
        username: "newuser",
        email: "new@example.com",
        password: "password123",
        password2: "password123",
        nick_name: "New User",
        user_type: "student",
        student_name: "New Student",
      });

      expect(result.user).toEqual(mockUser);
      expect(result.message).toBe("Registration successful");
    });

    it("중복 사용자명으로 회원가입에 실패한다", async () => {
      server.use(
        http.post(`${API_BASE_URL}/auth/register/`, () => {
          return HttpResponse.json(
            { username: ["A user with that username already exists."] },
            { status: 400 }
          );
        })
      );

      await expect(
        authApi.register({
          username: "existinguser",
          email: "existing@example.com",
          password: "password123",
          password2: "password123",
          nick_name: "Existing User",
          user_type: "student",
        })
      ).rejects.toThrow();
    });
  });

  describe("getProfile", () => {
    it("인증된 사용자의 프로필을 가져온다", async () => {
      localStorage.setItem("access_token", "valid-token");

      server.use(
        http.get(`${API_BASE_URL}/users/me/`, ({ request }) => {
          const authHeader = request.headers.get("Authorization");
          if (authHeader === "Bearer valid-token") {
            return HttpResponse.json(mockUser);
          }
          return HttpResponse.json(
            { detail: "Authentication credentials were not provided." },
            { status: 401 }
          );
        })
      );

      const result = await authApi.getProfile();

      expect(result).toEqual(mockUser);
    });

    it("인증되지 않은 사용자는 프로필 조회에 실패한다", async () => {
      server.use(
        http.get(`${API_BASE_URL}/users/me/`, () => {
          return HttpResponse.json(
            { detail: "Authentication credentials were not provided." },
            { status: 401 }
          );
        })
      );

      await expect(authApi.getProfile()).rejects.toThrow();
    });
  });

  describe("updateProfile", () => {
    it("프로필을 업데이트한다", async () => {
      localStorage.setItem("access_token", "valid-token");

      const updatedUser = { ...mockUser, nick_name: "Updated Name" };

      server.use(
        http.patch(`${API_BASE_URL}/users/me/`, () => {
          return HttpResponse.json(updatedUser);
        })
      );

      const result = await authApi.updateProfile({ nick_name: "Updated Name" });

      expect(result.nick_name).toBe("Updated Name");
    });

    it("유효하지 않은 이메일로 업데이트에 실패한다", async () => {
      localStorage.setItem("access_token", "valid-token");

      server.use(
        http.patch(`${API_BASE_URL}/users/me/`, () => {
          return HttpResponse.json(
            { email: ["Enter a valid email address."] },
            { status: 400 }
          );
        })
      );

      await expect(
        authApi.updateProfile({ email: "invalid-email" })
      ).rejects.toThrow();
    });
  });

  describe("changePassword", () => {
    it("비밀번호 변경에 성공한다", async () => {
      localStorage.setItem("access_token", "valid-token");

      server.use(
        http.put(`${API_BASE_URL}/users/me/change-password/`, () => {
          return HttpResponse.json({ message: "Password changed successfully" });
        })
      );

      const result = await authApi.changePassword({
        old_password: "oldpassword",
        new_password: "newpassword123",
        new_password2: "newpassword123",
      });

      expect(result.message).toBe("Password changed successfully");
    });

    it("현재 비밀번호가 틀리면 실패한다", async () => {
      localStorage.setItem("access_token", "valid-token");

      server.use(
        http.put(`${API_BASE_URL}/users/me/change-password/`, () => {
          return HttpResponse.json(
            { old_password: ["Current password is incorrect."] },
            { status: 400 }
          );
        })
      );

      await expect(
        authApi.changePassword({
          old_password: "wrongpassword",
          new_password: "newpassword123",
          new_password2: "newpassword123",
        })
      ).rejects.toThrow();
    });
  });

});
