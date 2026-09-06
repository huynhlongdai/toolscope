import { describe, it, expect, beforeEach } from "vitest";
import { getStoredTheme, setStoredTheme, initTheme } from "../theme";

describe("theme utilities", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("returns light as default theme", () => {
    expect(getStoredTheme()).toBe("light");
  });

  it("persists theme to localStorage", () => {
    setStoredTheme("dark");
    expect(localStorage.getItem("astute-tools-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("reads stored theme", () => {
    localStorage.setItem("astute-tools-theme", "dark");
    expect(getStoredTheme()).toBe("dark");
  });

  it("removes dark class when switching to light", () => {
    setStoredTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    setStoredTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("initTheme applies stored theme and returns it", () => {
    localStorage.setItem("astute-tools-theme", "dark");
    const theme = initTheme();
    expect(theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
