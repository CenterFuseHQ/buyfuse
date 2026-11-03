import { Script, createContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { buyerClientScript } from "./buyer-client.js";

type BackupFile = { size: number; text: () => Promise<string> };
type HarnessOptions = { failLocalRead?: boolean; failLocalWrite?: boolean };
type FormEvent = { preventDefault: () => void; target: MockElement };
type MockElement = {
  id: string;
  hidden: boolean;
  textContent: string;
  innerHTML: string;
  value: string;
  files: BackupFile[];
  href: string;
  download: string;
  dataset: Record<string, string>;
  onclick: (() => unknown) | null;
  onsubmit: ((event: FormEvent) => unknown) | null;
  onchange: ((event: { target: MockElement }) => unknown) | null;
  reset: () => void;
  click: () => void;
};

function createHarness(localValues = new Map<string, string>(), options: HarnessOptions = {}) {
  const elements = new Map<string, MockElement>();
  const statusSelect = createElement("status-select");
  statusSelect.dataset.item = "";
  let fetchCalls = 0;
  let capturedBlob: Blob | undefined;
  let downloadClicks = 0;
  let nextId = 0;
  const confirmations: string[] = [];

  function createElement(id: string): MockElement {
    const item: MockElement = {
      id,
      hidden: false,
      textContent: "",
      innerHTML: "",
      value: "",
      files: [],
      href: "",
      download: "",
      dataset: {},
      onclick: null,
      onsubmit: null,
      onchange: null,
      reset() { this.value = ""; },
      click() { downloadClicks += 1; }
    };
    elements.set(id, item);
    return item;
  }

  function get(id: string): MockElement {
    return elements.get(id) ?? createElement(id);
  }

  const localStorage = {
    getItem(key: string) {
      if (options.failLocalRead && key === "buyfuseLocalItems") throw new Error("Storage unavailable");
      return localValues.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (options.failLocalWrite && key === "buyfuseLocalItems") throw new Error("Storage quota exceeded");
      localValues.set(key, String(value));
    },
    removeItem(key: string) { localValues.delete(key); }
  };
  const sessionStorage = {
    getItem(_key: string) { return null; },
    setItem(_key: string, _value: string) {},
    removeItem(_key: string) {}
  };
  class TestURL extends URL {
    static createObjectURL(blob: Blob): string {
      capturedBlob = blob;
      return "blob:buyfuse-test";
    }
    static revokeObjectURL(_url: string): void {}
  }

  new Script(buyerClientScript).runInContext(createContext({
    document: {
      getElementById: get,
      querySelectorAll: () => [statusSelect],
      createElement: () => createElement("download-link")
    },
    window: { confirm: (message: string) => { confirmations.push(message); return true; } },
    sessionStorage,
    localStorage,
    crypto: { randomUUID: () => "local-item-" + (++nextId) },
    URL: TestURL,
    Blob,
    setTimeout: () => 0,
    fetch: async () => {
      fetchCalls += 1;
      throw new Error("Unexpected network request in local workspace test");
    }
  }));

  return {
    get,
    statusSelect,
    localValues,
    get fetchCalls() { return fetchCalls; },
    get capturedBlob() { return capturedBlob; },
    get downloadClicks() { return downloadClicks; },
    confirmations
  };
}

describe("BuyFuse local workspace", () => {
  it("saves, updates, exports and restores items without contacting the service", async () => {
    const app = createHarness();
    app.get("local-workspace").onclick?.();
    expect(app.get("workspace").hidden).toBe(false);
    expect(app.get("workspace-mode").textContent).toContain("not encrypted or uploaded");

    app.get("title").value = "Dining table";
    app.get("source-url").value = "https://shop.example/table/42?finish=oak";
    app.get("notes").value = "Measure the doorway";
    const form = app.get("save-form");
    await form.onsubmit?.({ preventDefault() {}, target: form });

    app.statusSelect.dataset.item = "local-item-1";
    app.statusSelect.value = "PURCHASED";
    await app.statusSelect.onchange?.({ target: app.statusSelect });
    const saved = JSON.parse(app.localValues.get("buyfuseLocalItems") ?? "[]") as Array<{ title: string; status: string }>;
    expect(saved).toMatchObject([{ title: "Dining table", status: "PURCHASED" }]);
    expect(app.get("items").innerHTML).toContain("Dining table");

    app.get("export-backup").onclick?.();
    expect(app.downloadClicks).toBe(1);
    const exported = JSON.parse(await app.capturedBlob?.text() ?? "{}") as { format?: string; items?: unknown[] };
    expect(exported.format).toBe("buyfuse-workspace-backup");
    expect(exported.items).toHaveLength(1);

    const restoredApp = createHarness(app.localValues);
    restoredApp.get("local-workspace").onclick?.();
    const backupFile = restoredApp.get("backup-file");
    backupFile.files = [{ size: (await app.capturedBlob?.text() ?? "").length, text: async () => await app.capturedBlob?.text() ?? "" }];
    await backupFile.onchange?.({ target: backupFile });
    const restored = JSON.parse(restoredApp.localValues.get("buyfuseLocalItems") ?? "[]") as unknown[];
    expect(restored).toHaveLength(2);
    expect(app.fetchCalls + restoredApp.fetchCalls).toBe(0);
  });

  it("keeps malformed local data untouched and replaces it only after an explicit backup restore", async () => {
    const original = "{malformed local data";
    const localValues = new Map([["buyfuseLocalItems", original]]);
    const app = createHarness(localValues);
    app.get("local-workspace").onclick?.();
    expect(app.get("workspace").hidden).toBe(false);
    expect(app.get("workspace-mode").textContent).toContain("has not been changed");
    expect(localValues.get("buyfuseLocalItems")).toBe(original);

    app.get("title").value = "New item";
    const form = app.get("save-form");
    await form.onsubmit?.({ preventDefault() {}, target: form });
    expect(localValues.get("buyfuseLocalItems")).toBe(original);

    const backup = JSON.stringify({
      format: "buyfuse-workspace-backup",
      version: 1,
      items: [{ title: "Recovered lamp", status: "CONSIDERING" }]
    });
    app.get("backup-file").files = [{ size: backup.length, text: async () => backup }];
    await app.get("backup-file").onchange?.({ target: app.get("backup-file") });
    expect(app.confirmations[0]).toContain("Replace unreadable local data");
    expect(JSON.parse(localValues.get("buyfuseLocalItems") ?? "[]")).toMatchObject([
      { title: "Recovered lamp", status: "CONSIDERING" }
    ]);
    expect(app.fetchCalls).toBe(0);
  });

  it("rejects malformed backups without changing existing local items", async () => {
    const localValues = new Map([["buyfuseLocalItems", JSON.stringify([{ id: "one", title: "Existing lamp", status: "CONSIDERING" }])]]);
    const app = createHarness(localValues);
    app.get("local-workspace").onclick?.();
    const original = localValues.get("buyfuseLocalItems");
    const invalidBackups = [
      "{not json",
      JSON.stringify({ format: "other", version: 1, items: [] }),
      JSON.stringify({ format: "buyfuse-workspace-backup", version: 1, items: [{ title: "Unsafe link", sourceUrl: "javascript:alert(1)", status: "CONSIDERING" }] }),
      JSON.stringify({ format: "buyfuse-workspace-backup", version: 1, items: [{ title: "Unknown state", status: "PAID" }] })
    ];
    for (const content of invalidBackups) {
      app.get("backup-file").files = [{ size: content.length, text: async () => content }];
      await app.get("backup-file").onchange?.({ target: app.get("backup-file") });
      expect(app.get("status").textContent).toContain("Could not restore this file");
      expect(localValues.get("buyfuseLocalItems")).toBe(original);
    }
  });

  it("reports unavailable browser storage without overwriting existing values", async () => {
    const app = createHarness(new Map(), { failLocalRead: true });
    app.get("local-workspace").onclick?.();
    expect(app.get("workspace").hidden).toBe(false);
    expect(app.get("workspace-mode").textContent).toContain("storage is unavailable");
    expect(app.fetchCalls).toBe(0);

    const original = JSON.stringify([{ id: "one", title: "Existing lamp", status: "CONSIDERING" }]);
    const localValues = new Map([["buyfuseLocalItems", original]]);
    const writeFailureApp = createHarness(localValues, { failLocalWrite: true });
    writeFailureApp.get("local-workspace").onclick?.();
    writeFailureApp.get("title").value = "New item";
    const form = writeFailureApp.get("save-form");
    await form.onsubmit?.({ preventDefault() {}, target: form });
    expect(writeFailureApp.get("status").textContent).toContain("Existing entries were left unchanged");
    expect(localValues.get("buyfuseLocalItems")).toBe(original);
    expect(writeFailureApp.fetchCalls).toBe(0);
  });
});
