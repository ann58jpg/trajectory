import { Badge } from "@/components/ui/badge";
import type { Outlook } from "@/lib/schemas";
import { OUTLOOK_LABEL } from "@/lib/engine/vocab";

const DOT = { green: "🟢", yellow: "🟡", red: "🔴" } as const;

export function OutlookBadge({ status, reason }: { status: Outlook; reason?: string }) {
  return (
    <Badge variant={status} title={reason ? `Перспектива на 5 лет: ${reason}` : undefined} data-outlook={status}>
      <span aria-hidden>{DOT[status]}</span> {OUTLOOK_LABEL[status]}
    </Badge>
  );
}
