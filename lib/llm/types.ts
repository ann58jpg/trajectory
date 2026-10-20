import type { ZodType } from "zod";

export type CompleteJSONOptions<T> = {
  system: string;
  user: string;
  schema: ZodType<T>;
  /** Подключить серверный web search (только провайдеры, которые его поддерживают). */
  webSearch?: { maxUses?: number; allowedDomains?: string[] };
  maxTokens?: number;
  timeoutMs?: number;
};

/** Единый интерфейс ИИ-провайдера: Anthropic сейчас, YandexGPT/GigaChat — для госвнедрения в РФ. */
export interface LLMProvider {
  readonly id: "anthropic" | "yandexgpt" | "gigachat" | "none";
  readonly label: string;
  readonly supportsWebSearch: boolean;
  available(): boolean;
  /** Возвращает объект, прошедший zod-схему, или бросает ошибку (вызывающий код делает фолбэк). */
  completeJSON<T>(opts: CompleteJSONOptions<T>): Promise<T>;
}

export class LLMUnavailableError extends Error {
  name = "LLMUnavailableError";
}

/** Достаёт первый JSON-объект из текста ответа модели. */
export function extractJSON(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("В ответе нет JSON");
  return JSON.parse(body.slice(start, end + 1));
}
