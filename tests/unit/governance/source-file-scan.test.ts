import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sourceFilesMatching } from "../../support/source-file-scan";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "lafusee-writer-scan-"));
  mkdirSync(join(root, "src", "nested"), { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("portable single-writer scans remain strict", () => {
  it.each(["create", "createMany", "upsert"])("finds a forbidden %s writer in a nested TSX file", operation => {
    writeFileSync(join(root, "src", "allowed.ts"), "db.communitySnapshot.create({})");
    writeFileSync(join(root, "src", "nested", "forbidden.tsx"), `db.communitySnapshot.${operation}({})`);
    writeFileSync(join(root, "src", "excluded.js"), "db.communitySnapshot.create({})");
    const files = sourceFilesMatching(root, /communitySnapshot\.(create|createMany|upsert)/, [".ts", ".tsx"]);
    expect(files).toEqual(["src/allowed.ts", "src/nested/forbidden.tsx"]);
    expect(files.filter(file => file !== "src/allowed.ts")).toEqual(["src/nested/forbidden.tsx"]);
  });
  it("keeps the forecast scan's original all-file scope", () => {
    writeFileSync(join(root, "src", "nested", "writer.js"), "db.predictionRecord.create({})");
    expect(sourceFilesMatching(root, /predictionRecord.create/)).toEqual(["src/nested/writer.js"]);
  });
  it("fails when the source root cannot be read, rather than returning an empty allowlist", () => {
    expect(() => sourceFilesMatching(join(root, "missing"), /superfanProfile\.(create|upsert|createMany)/, [".ts", ".tsx"])).toThrow();
  });
});
