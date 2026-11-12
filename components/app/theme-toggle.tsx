"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { KEYS } from "@/lib/client/storage";
import { HEADER } from "@/lib/copy";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(KEYS.theme, next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? HEADER.themeLight : HEADER.themeDark}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

/** Ставит тему до отрисовки, чтобы не было вспышки. Тёмная — только если её включили переключателем. */
export const themeScript = `try{var t=localStorage.getItem("${KEYS.theme}");if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}`;
