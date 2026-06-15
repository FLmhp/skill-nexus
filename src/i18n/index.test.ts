import { describe, expect, it } from "vitest";
import { setLanguage, translate } from "./index";

describe("i18n", () => {
  it("falls back to English when a key is missing in the active language", () => {
    setLanguage("zh");

    expect(translate("common.loading")).toBe("加载中...");
    expect(translate("unknown.key")).toBe("unknown.key");
  });

  it("interpolates variables in translated strings", () => {
    setLanguage("en");

    expect(translate("skills.subtitle", { count: 2, plural: "s" })).toBe("2 skills in your library");
  });
});
