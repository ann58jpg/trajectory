"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND, VIBE_CARD } from "@/lib/copy";
import { track } from "@/lib/analytics";

/** Нарисовать карточку 1080×1920 (сторис VK и Telegram). */
export function drawVibeCard(canvas: HTMLCanvasElement, opts: { kicker: string; title: string; listTitle: string; items: string[]; footer: string }) {
  canvas.width = 1080;
  canvas.height = 1920;
  const g = canvas.getContext("2d");
  if (!g) return;
  const grad = g.createLinearGradient(0, 0, 0, 1920);
  grad.addColorStop(0, "#0d4cd3");
  grad.addColorStop(1, "#1d7af2");
  g.fillStyle = grad;
  g.fillRect(0, 0, 1080, 1920);
  g.fillStyle = "rgba(255,255,255,0.08)";
  g.beginPath(); g.arc(900, 260, 320, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(120, 1700, 260, 0, Math.PI * 2); g.fill();
  const font = (w: number, px: number) => `${w} ${px}px Inter, "Segoe UI", system-ui, sans-serif`;
  const wrap = (text: string, x: number, y: number, max: number, lh: number) => {
    const words = text.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (g.measureText(test).width > max && line) {
        g.fillText(line, x, y);
        line = w;
        y += lh;
      } else line = test;
    }
    g.fillText(line, x, y);
    return y + lh;
  };
  g.fillStyle = "#ffffff";
  g.font = font(600, 48);
  g.fillText(opts.kicker, 96, 420);
  g.font = font(800, 116);
  let y = wrap(opts.title, 96, 570, 888, 128);
  g.fillStyle = "rgba(255,255,255,0.18)";
  g.fillRect(96, y + 10, 888, 4);
  y += 110;
  g.fillStyle = "#ffffff";
  g.font = font(600, 48);
  g.fillText(opts.listTitle, 96, y);
  y += 40;
  for (const it of opts.items.slice(0, 3)) {
    y += 36;
    g.fillStyle = "rgba(255,255,255,0.16)";
    g.beginPath();
    g.roundRect(96, y, 888, 130, 32);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = font(700, 54);
    g.fillText(it.length > 30 ? it.slice(0, 29) + "…" : it, 140, y + 84);
    y += 130;
  }
  // логотип
  g.fillStyle = "#ffffff";
  g.beginPath(); g.roundRect(96, 1640, 110, 110, 28); g.fill();
  g.fillStyle = "#0d4cd3";
  g.font = font(800, 64);
  g.fillText("Т", 128, 1718);
  g.fillStyle = "#ffffff";
  g.font = font(800, 64);
  g.fillText(BRAND, 236, 1712);
  g.font = font(500, 38);
  g.fillText(opts.footer, 236, 1762);
}

/** Превью карточки и кнопки «Поделиться» / «Скачать». */
export function VibeCard({ kicker, title, listTitle, items, fileName, kind }: { kicker: string; title: string; listTitle: string; items: string[]; fileName: string; kind: "applicant" | "university" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    drawVibeCard(ref.current, { kicker, title, listTitle, items, footer: VIBE_CARD.footer });
    setUrl(ref.current.toDataURL("image/png"));
  }, [kicker, title, listTitle, items]);
  const blob = () => new Promise<Blob | null>((res) => ref.current?.toBlob(res, "image/png"));
  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  };
  const share = async () => {
    track("vibe_card_share", { kind });
    const b = await blob();
    const file = b ? new File([b], fileName, { type: "image/png" }) : null;
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${VIBE_CARD.shareText}${title}` });
        return;
      }
    } catch {
      /* отменили — ничего страшного */
    }
    download();
  };
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start" data-testid="vibe-card">
      <canvas ref={ref} className="hidden" />
      {url && <img src={url} alt={`${kicker}: ${title}`} className="w-40 rounded-xl border shadow-sm" width={1080} height={1920} data-testid="vibe-card-img" />}
      <div className="space-y-2">
        <Button onClick={share} data-testid="vibe-card-share"><Share2 /> {VIBE_CARD.share}</Button>
        <Button variant="outline" onClick={download}><Download /> {VIBE_CARD.download}</Button>
      </div>
    </div>
  );
}
