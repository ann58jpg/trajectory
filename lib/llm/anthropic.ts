import Anthropic from "@anthropic-ai/sdk";
import { extractJSON, type CompleteJSONOptions, type LLMProvider } from "./types";

/**
 * Основной провайдер. Модель — ANTHROPIC_MODEL (по умолчанию claude-sonnet-5-5).
 * Поиск свежих мероприятий — серверный инструмент web search (`web_search_20260209`,
 * версию можно переопределить через ANTHROPIC_WEB_SEARCH_TOOL).
 * Включён серверный фолбэк при отказе модели (`fallbacks: "default"`).
 */
export class AnthropicProvider implements LLMProvider {
  readonly id = "anthropic" as const;
  readonly label = "Claude (Anthropic)";
  readonly supportsWebSearch = true;
  private client: Anthropic | null = null;

  available() {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  private getClient() {
    // повтор делаем сами (ровно один), поэтому встроенные ретраи SDK отключены
    this.client ??= new Anthropic({ maxRetries: 0 });
    return this.client;
  }

  get model() {
    return process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  }

  async completeJSON<T>(opts: CompleteJSONOptions<T>): Promise<T> {
    const client = this.getClient();
    const tools: Anthropic.Beta.Messages.BetaToolUnion[] = [];
    if (opts.webSearch) {
      tools.push({
        type: (process.env.ANTHROPIC_WEB_SEARCH_TOOL as "web_search_20260209") || "web_search_20260209",
        name: "web_search",
        max_uses: opts.webSearch.maxUses ?? 5,
        ...(opts.webSearch.allowedDomains?.length ? { allowed_domains: opts.webSearch.allowedDomains } : {}),
      } as Anthropic.Beta.Messages.BetaToolUnion);
    }
    const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [{ role: "user", content: opts.user }];
    const timeout = opts.timeoutMs ?? 20_000;

    // Серверные инструменты могут поставить ход на паузу (pause_turn) — продолжаем до 3 раз.
    for (let i = 0; i < 3; i++) {
      const res = await client.beta.messages.create(
        {
          model: this.model,
          max_tokens: opts.maxTokens ?? 4000,
          system: opts.system,
          messages,
          output_config: { effort: opts.webSearch ? "medium" : "low" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          ...(tools.length ? { tools } : {}),
        },
        { timeout },
      );
      if (res.stop_reason === "refusal") throw new Error("Модель отказалась отвечать");
      if (res.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: res.content });
        continue;
      }
      const text = res.content
        .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return opts.schema.parse(extractJSON(text));
    }
    throw new Error("Ответ модели не завершился");
  }
}
