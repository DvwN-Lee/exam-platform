import { http, HttpResponse } from "msw";

const API_BASE_URL = "http://localhost:8000/api";

export const handlers = [
  // Auth handlers
  http.post(`${API_BASE_URL}/auth/login/`, async ({ request }) => {
    const body = (await request.json()) as {
      username: string;
      password: string;
    };

    if (body.username === "testuser" && body.password === "testpass123") {
      return HttpResponse.json({
        access: "mock-access-token",
        refresh: "mock-refresh-token",
        user: {
          id: 1,
          username: "testuser",
          email: "test@example.com",
          role: "student",
        },
      });
    }

    return HttpResponse.json(
      { detail: "Invalid credentials" },
      { status: 401 }
    );
  }),

  http.post(`${API_BASE_URL}/auth/register/`, async ({ request }) => {
    const body = (await request.json()) as {
      username: string;
      email: string;
      password: string;
    };

    if (body.username === "existinguser") {
      return HttpResponse.json(
        { username: ["A user with that username already exists."] },
        { status: 400 }
      );
    }

    return HttpResponse.json(
      {
        id: 2,
        username: body.username,
        email: body.email,
      },
      { status: 201 }
    );
  }),

  http.post(`${API_BASE_URL}/auth/refresh/`, async ({ request }) => {
    const body = (await request.json()) as { refresh: string };

    if (body.refresh === "valid-refresh-token") {
      return HttpResponse.json({
        access: "new-access-token",
      });
    }

    return HttpResponse.json({ detail: "Token is invalid" }, { status: 401 });
  }),

  http.get(`${API_BASE_URL}/auth/profile/`, ({ request }) => {
    const authHeader = request.headers.get("Authorization");

    if (authHeader === "Bearer mock-access-token") {
      return HttpResponse.json({
        id: 1,
        username: "testuser",
        email: "test@example.com",
        role: "student",
      });
    }

    return HttpResponse.json(
      { detail: "Authentication credentials were not provided." },
      { status: 401 }
    );
  }),
];
