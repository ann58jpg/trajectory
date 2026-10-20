import { afterEach, describe, expect, it, vi } from "vitest";
import { extractJSON } from "@/lib/llm/types";
import { DreamParse, Explanation } from "@/lib/schemas";

describe("ИИ-слой", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("достаёт JSON из ответа модели (в том числе в ```json```)", () => {
    expect(extractJSON('Вот: {"tags":["it"],"values":[],"fears":[]} готово')).toEqual({ tags: ["it"], values: [], fears: [] });
    expect(extractJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => extractJSON("без json")).toThrow();
  });

  it("невалидный ответ ИИ не проходит zod-схему → вызывающий код делает фолбэк", () => {
    expect(DreamParse.safeParse({ tags: "it" }).success).toBe(false);
    expect(Explanation.safeParse({ whyYou: "коротко", dayInLife: "", askStudents: [] }).success).toBe(false);
  });

  it("без ключа — демо-режим (NoLLMProvider)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { getProvider, aiMode } = await import("@/lib/llm");
    expect(getProvider().id).toBe("none");
    expect(aiMode()).toBe("demo");
    await expect(getProvider().completeJSON({ system: "", user: "", schema: DreamParse })).rejects.toThrow();
  });

  it("с ключом — AnthropicProvider, модель из ANTHROPIC_MODEL (по умолчанию claude-sonnet-5-5)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test");
    vi.stubEnv("ANTHROPIC_MODEL", "");
    vi.stubEnv("LLM_PROVIDER", "");
    const { getProvider } = await import("@/lib/llm");
    const p = getProvider() as unknown as { id: string; model: string; supportsWebSearch: boolean };
    expect(p.id).toBe("anthropic");
    expect(p.model).toBe("claude-sonnet-5-5");
    expect(p.supportsWebSearch).toBe(true);
  });

  it("YandexGPT/GigaChat — заглушки с тем же интерфейсом; без реализации — демо-режим", async () => {
    vi.stubEnv("LLM_PROVIDER", "gigachat");
    const { getProvider } = await import("@/lib/llm");
    expect(getProvider().id).toBe("none");
    const { YandexGPTProvider, GigaChatProvider } = await import("@/lib/llm/stubs");
    await expect(new YandexGPTProvider().completeJSON({ system: "", user: "", schema: DreamParse })).rejects.toThrow(/не реализован/);
    await expect(new GigaChatProvider().completeJSON({ system: "", user: "", schema: DreamParse })).rejects.toThrow(/не реализован/);
  });

  it("withRetry повторяет ровно один раз", async () => {
    const { withRetry } = await import("@/lib/llm");
    let n = 0;
    await expect(
      withRetry(async () => {
        n++;
        throw new Error("timeout");
      }),
    ).rejects.toThrow("timeout");
    expect(n).toBe(2);
  });
});
