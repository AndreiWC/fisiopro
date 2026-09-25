"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ButtonShareLink({ organizationId }: { organizationId: string }) {
  async function handleShare() {
    const url = `${process.env.NEXT_PUBLIC_BASE_URL}/clinica/${organizationId}`;

    // No celular abre o menu de compartilhamento (WhatsApp, Instagram...); no computador copia.
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    if (isTouchDevice && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Agende seu horário", url });
        return;
      } catch (error) {
        // Fechar o menu sem escolher nada não é erro.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast("Link copiado para a área de transferência!");
    } catch {
      toast.error("Não foi possível copiar o link. Tente novamente.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 shrink-0 gap-2 rounded-full px-4"
      onClick={handleShare}
    >
      <Share2 className="h-4 w-4" />
      Compartilhar
    </Button>
  );
}
