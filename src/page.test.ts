import { describe, expect, it } from "vitest";
import { renderBuyFuseDashboard, renderBuyFuseState } from "./page.js";
describe("BuyFuse application", () => {
  it("preserves real authenticated item workflows and accessibility affordances", () => {
    const html = renderBuyFuseDashboard();
    expect(html).toContain("Save an item");
    expect(html).toContain("Your items");
    expect(html).toContain('id="auth"');
    expect(html).toContain('id="workspace"');
    expect(html).toContain('id="save-form"');
    expect(html).toContain("sessionStorage");
    expect(html).toContain('role="status"');
    expect(html).toContain("Nothing saved yet");
  });
  it("presents an isolated browser-only buyer journey with responsive light/dark themes", () => {
    const html = renderBuyFuseDashboard();
    expect(html).toContain('id="bf-dark"');
    expect(html).toContain('id="buyer-demo-form"');
    expect(html).toContain('id="buyer-demo-result"');
    expect(html).toContain("Simulated preview only");
    expect(html).toContain("prefers-reduced-motion");
    expect(html).toContain("max-width:45rem");
    expect(html).toContain('aria-live="polite"');
  });
  it("includes loading error and empty states", () => {
    expect(renderBuyFuseState("loading")).toContain("Loading BuyFuse");
    expect(renderBuyFuseState("error")).toContain('role="alert"');
  });
});
