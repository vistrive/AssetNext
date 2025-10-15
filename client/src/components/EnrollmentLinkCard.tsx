import * as React from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, ExternalLink, QrCode } from "lucide-react";

type Props = {
  /** optional override (e.g. when behind a proxy) */
  baseUrl?: string;
};

export function EnrollmentLinkCard({ baseUrl }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const enrollUrl = useMemo(
    () => `${baseUrl || origin}/enroll`,
    [baseUrl, origin]
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(enrollUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      toast({ title: "Link copied", description: "Share it in Teams/WhatsApp/Email" });
    } catch {
      toast({ title: "Copy failed", description: enrollUrl, variant: "destructive" });
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold">Add Devices</div>
          <div className="text-sm text-muted-foreground">
            Share this link with employees to enroll their device. No terminal needed.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={enrollUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <Label htmlFor="enroll-link" className="text-xs text-muted-foreground">
          Enrollment link
        </Label>
        <div className="flex gap-2">
          <Input id="enroll-link" readOnly value={enrollUrl} />
          <Button variant="secondary" size="icon" title="Show QR (opens new tab)" asChild>
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                enrollUrl
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              <QrCode className="h-4 w-4" />
            </a>
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Tip: test platform detection with{" "}
          <code className="rounded bg-muted px-1 py-0.5">/enroll?os=mac</code> or{" "}
          <code className="rounded bg-muted px-1 py-0.5">/enroll?os=win</code>.
        </div>
      </div>
    </div>
  );
}
