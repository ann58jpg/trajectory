import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BANNED } from "@/lib/copy-rules";

const ROOT = path.resolve(__dirname, "../..");

function walk(dir: string, ext: RegExp, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (ext.test(e.name)) out.push(p);
  }
  return out;
}

/** Убираем комментарии кода: их пользователь не видит. */
function stripComments(src: string) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s\/\/\s.*$/gm, "");
}

// Всё, что видит пользователь: страницы, компоненты, тексты, фразы подборки, промпты ИИ.
// /admin — служебные страницы команды, там допустимы рабочие термины.
const UI_FILES = [
  ...walk(path.join(ROOT, "app"), /\.tsx?$/).filter((f) => !f.includes(`${path.sep}admin${path.sep}`) && !f.includes(`${path.sep}api${path.sep}admin`)),
  ...walk(path.join(ROOT, "components"), /\.tsx?$/),
  path.join(ROOT, "lib/copy.ts"),
  path.join(ROOT, "lib/llm/prompts.ts"),
  ...["templates", "exams", "filters", "tradeoffs", "recommend", "scoring", "profile", "ru", "vocab"].map((f) => path.join(ROOT, `lib/engine/${f}.ts`)),
].filter((f) => fs.existsSync(f));

function findBanned(text: string) {
  return BANNED.filter((b) => b.re.test(text)).map((b) => b.word);
}

describe("тексты интерфейса", () => {
  it("в коде интерфейса нет запрещённых слов", () => {
    const problems: string[] = [];
    for (const f of UI_FILES) {
      const src = stripComments(fs.readFileSync(f, "utf8")).replace(/^export const BRAND = .*$/m, "");
      src.split("\n").forEach((line, i) => {
        const hit = findBanned(line);
        if (hit.length) problems.push(`${path.relative(ROOT, f)}:${i + 1} → ${hit.join(", ")}: ${line.trim().slice(0, 120)}`);
      });
    }
    expect(problems).toEqual([]);
  });

  it("в текстах данных, которые видит пользователь, нет запрещённых слов", () => {
    const problems: string[] = [];
    const visit = (file: string, v: unknown, where: string) => {
      if (typeof v === "string") {
        const hit = findBanned(v);
        if (hit.length) problems.push(`${file} ${where} → ${hit.join(", ")}: ${v.slice(0, 100)}`);
      } else if (Array.isArray(v)) v.forEach((x, i) => visit(file, x, `${where}[${i}]`));
      else if (v && typeof v === "object")
        for (const [k, x] of Object.entries(v)) if (!["id", "code", "source", "url", "site", "admissionUrl", "eventsUrl", "hhQuery", "meta"].includes(k)) visit(file, x, `${where}.${k}`);
    };
    for (const f of walk(path.join(ROOT, "data"), /\.json$/)) visit(path.relative(ROOT, f), JSON.parse(fs.readFileSync(f, "utf8")), "");
    expect(problems.slice(0, 30)).toEqual([]);
  });

  it("проверка ловит запрещённые слова, но не похожие обычные", () => {
    expect(findBanned("Движок подобрал")).toContain("движок");
    expect(findBanned("Метч 87%")).toContain("метч");
    expect(findBanned("учёт веса факторов")).toEqual(expect.arrayContaining(["вес", "фактор"]));
    expect(findBanned("нужна военная кафедра (ВУЦ)")).toContain("ВУЦ");
    expect(findBanned("весь день, весной, интересно, повесть")).toEqual([]);
    expect(findBanned("Мы подобрали профессии")).toEqual([]);
  });
});
