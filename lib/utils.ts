import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const rub = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${(Math.round(n / 1000) * 1000).toLocaleString("ru-RU")} ₽`;

export const rubK = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${Math.round(n / 1000).toLocaleString("ru-RU")} тыс. ₽`;

export const pct = (x: number) => `${Math.round(x * 100)}%`;
