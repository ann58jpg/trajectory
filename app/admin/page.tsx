"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePresentation } from "@/lib/client/storage";
import { ADMIN } from "./copy";

export default function AdminPage() {
  const [presentation, setPresentation, ready] = usePresentation();
  return (
    <div className="mx-auto max-w-2xl space-y-4 pt-6" data-testid="admin">
      <h1 className="text-2xl font-bold">{ADMIN.title}</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">{ADMIN.presentation}</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">{ADMIN.presentationHint}</p>
          <Button
            variant={presentation ? "default" : "outline"}
            onClick={() => setPresentation(!presentation)}
            disabled={!ready}
            aria-pressed={presentation}
            data-testid="presentation-toggle"
          >
            {ADMIN.presentation}: {presentation ? ADMIN.on : ADMIN.off}
          </Button>
        </CardContent>
      </Card>
      {[["/admin/weights", ADMIN.weights, ADMIN.weightsHint], ["/admin/funnel", ADMIN.funnel, ADMIN.funnelHint], ["/data-gaps", ADMIN.gaps, ""]].map(([href, t, h]) => (
        <Link key={href} href={href} className="block rounded-lg border p-4 hover:bg-muted">
          <p className="font-medium">{t}</p>
          {h && <p className="text-sm text-muted-foreground">{h}</p>}
        </Link>
      ))}
    </div>
  );
}
