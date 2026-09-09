"use client";

import { Button } from "@/components/ui/button";
import { LinkIcon } from "lucide-react";
import { toast } from "sonner";

export function ButtonCopyLink({ organizationId }: { organizationId: string }) {
  async function handleCopyLink() {
    await navigator.clipboard.writeText(
      `${process.env.NEXT_PUBLIC_BASE_URL}/clinica/${organizationId}`,
    );

    toast("Link copiado para a área de transferência!");
  }

  return (
    <Button variant="outline" size="icon" onClick={handleCopyLink}>
      <LinkIcon className="w-5 h-5" />
    </Button>
  );
}
