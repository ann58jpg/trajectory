import { LLMUnavailableError, type CompleteJSONOptions, type LLMProvider } from "./types";

/**
 * Заглушки для отечественных моделей (будущее госвнедрение в РФ).
 * Интерфейс тот же, что у AnthropicProvider: достаточно реализовать completeJSON.
 * YandexGPT: https://llm.api.cloud.yandex.net/foundationModels/v1/completion (YANDEX_API_KEY, YANDEX_FOLDER_ID)
 * GigaChat:  https://gigachat.devices.sberbank.ru/api/v1/chat/completions (GIGACHAT_AUTH_KEY, OAuth через ngw.devices.sberbank.ru)
 */
export class YandexGPTProvider implements LLMProvider {
  readonly id = "yandexgpt" as const;
  readonly label = "YandexGPT (заглушка)";
  readonly supportsWebSearch = false;
  available() {
    return false;
  }
  async completeJSON<T>(_opts: CompleteJSONOptions<T>): Promise<T> {
    void _opts;
    throw new LLMUnavailableError("YandexGPTProvider ещё не реализован");
  }
}

export class GigaChatProvider implements LLMProvider {
  readonly id = "gigachat" as const;
  readonly label = "GigaChat (заглушка)";
  readonly supportsWebSearch = false;
  available() {
    return false;
  }
  async completeJSON<T>(_opts: CompleteJSONOptions<T>): Promise<T> {
    void _opts;
    throw new LLMUnavailableError("GigaChatProvider ещё не реализован");
  }
}

/** Детерминированный режим без ИИ: всё считает движок, тексты — из шаблонов. */
export class NoLLMProvider implements LLMProvider {
  readonly id = "none" as const;
  readonly label = "Без ИИ (демо-режим)";
  readonly supportsWebSearch = false;
  available() {
    return true;
  }
  async completeJSON<T>(_opts: CompleteJSONOptions<T>): Promise<T> {
    void _opts;
    throw new LLMUnavailableError("Демо-режим: ИИ отключён");
  }
}
