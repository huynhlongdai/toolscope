import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminGuard } from "../AdminGuard";

// Mock useAuth
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
}));

// Mock useAdminAuth
vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: vi.fn(),
}));

import { useAuth } from "@/lib/auth";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseAdminAuth = vi.mocked(useAdminAuth);

describe("AdminGuard", () => {
  it("shows loading spinner while auth is loading", () => {
    mockedUseAuth.mockReturnValue({ user: null, session: null, loading: true, signOut: vi.fn() });
    mockedUseAdminAuth.mockReturnValue({ isAdmin: false, isEditor: false, isAdminOrEditor: false, loading: true, user: null });

    render(
      <MemoryRouter>
        <AdminGuard><div>Admin Content</div></AdminGuard>
      </MemoryRouter>
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("redirects to /auth if no user", () => {
    mockedUseAuth.mockReturnValue({ user: null, session: null, loading: false, signOut: vi.fn() });
    mockedUseAdminAuth.mockReturnValue({ isAdmin: false, isEditor: false, isAdminOrEditor: false, loading: false, user: null });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminGuard><div>Admin Content</div></AdminGuard>
      </MemoryRouter>
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("redirects to / if user is not admin", () => {
    const fakeUser = { id: "123" } as any;
    mockedUseAuth.mockReturnValue({ user: fakeUser, session: null, loading: false, signOut: vi.fn() });
    mockedUseAdminAuth.mockReturnValue({ isAdmin: false, isEditor: false, isAdminOrEditor: false, loading: false, user: fakeUser });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminGuard><div>Admin Content</div></AdminGuard>
      </MemoryRouter>
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("renders children if user is admin", () => {
    const fakeUser = { id: "123" } as any;
    mockedUseAuth.mockReturnValue({ user: fakeUser, session: null, loading: false, signOut: vi.fn() });
    mockedUseAdminAuth.mockReturnValue({ isAdmin: true, isEditor: false, isAdminOrEditor: true, loading: false, user: fakeUser });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminGuard><div>Admin Content</div></AdminGuard>
      </MemoryRouter>
    );

    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("renders children if user is editor", () => {
    const fakeUser = { id: "456" } as any;
    mockedUseAuth.mockReturnValue({ user: fakeUser, session: null, loading: false, signOut: vi.fn() });
    mockedUseAdminAuth.mockReturnValue({ isAdmin: false, isEditor: true, isAdminOrEditor: true, loading: false, user: fakeUser });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminGuard><div>Admin Content</div></AdminGuard>
      </MemoryRouter>
    );

    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });
});
