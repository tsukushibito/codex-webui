import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("browser entry routes", () => {
  beforeEach(() => {
    redirectMock.mockReset();
  });

  it("redirects / to /chat", async () => {
    const { default: HomePage } = await import("../app/page");

    HomePage();

    expect(redirectMock).toHaveBeenCalledWith("/chat");
  });

  it("redirects /approvals to /chat", async () => {
    const { default: ApprovalPage } = await import("../app/approvals/page");

    ApprovalPage();

    expect(redirectMock).toHaveBeenCalledWith("/chat");
  });
});
