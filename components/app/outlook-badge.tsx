import { Badge } from "@/components/ui/badge";
import type { Outlook } from "@/lib/schemas";
import { GLOSSARY, OUTLOOK_TEXT } from "@/lib/copy";

const DOT = { green: "🟢", yellow: "🟡", red: "🔴" } as const;

export function OutlookBadge({ status, reason }: { status: Outlook; reason?: string }) {
  return (
    <Badge variant={status} title={reason ? `${GLOSSARY.outlook.label}: ${reason}` : GLOSSARY.outlook.hint} data-outlook={status}>
      <span aria-hidden>{DOT[status]}</span> {OUTLOOK_TEXT[status]}
    </Badge>
  );
}
