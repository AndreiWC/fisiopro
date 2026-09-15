import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  onNewAppointment: () => void;
}

export function EmptyState({ title, description, onNewAppointment }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
      <CalendarPlus className="h-8 w-8 text-muted-foreground" />
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      </div>
      <Button size="sm" className="gap-1.5" onClick={onNewAppointment}>
        <CalendarPlus className="h-4 w-4" />
        Novo agendamento
      </Button>
    </div>
  );
}
