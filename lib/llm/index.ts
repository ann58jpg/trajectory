import { AnthropicProvider } from "./anthropic";
import { GigaChatProvider, NoLLMProvider, YandexGPTProvider } from "./stubs";
import type { LLMProvider } from "./types";

let provider: LLMProvider | null = null;

/** Выбор провайдера: LLM_PROVIDER, иначе Anthropic при наличии ключа, иначе демо-режим. */
export function getProvider(): LLMProvider {
  if (provider) return provider;
  const wanted = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
  const candidates: LLMProvider[] =
    wanted === "yandexgpt" ? [new YandexGPTProvider()]
    : wanted === "gigachat" ? [new GigaChatProvider()]
    : wanted === "none" ? []
    : [new AnthropicProvider()];
  provider = candidates.find((p) => p.available()) ?? new NoLLMProvider();
  return provider;
}

export const aiMode = (): "ai" | "demo" => (getProvider().id === "none" ? "demo" : "ai");

/** Таймаут → повтор один раз → ошибка (вызывающий код делает фолбэк на шаблоны). */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (e instanceof Error && e.name === "LLMUnavailableError") break;
    }
  }
  throw last;
}
