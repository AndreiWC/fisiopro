"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reminder } from "@prisma/client";
import { Plus, Trash } from "lucide-react";
import { deleteReminder } from "../../_actions/delete-reminder";
import { toast } from "sonner";
import { useRouter } from "next/dist/client/components/navigation";
import {
  Dialog,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { ReminderContent } from "./reminder-content";
import { useState } from "react";

interface ReminderListProps {
  reminder: Reminder[];
}

async function handleDeleteReminder(id: string) {
  const response = await deleteReminder({ reminderId: id });
  if (response.error) {
    toast.error(response.error);
  }

  toast.success(response.data);
}
export function ReminderList({ reminder }: ReminderListProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 lg:h-full">
      <Card className="gap-2 overflow-hidden p-2 lg:h-full lg:min-h-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-2">
          <CardTitle className="text-xl md:text-2xl">Lembretes</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="w-9 p-0">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar Lembrete</DialogTitle>
                <DialogDescription>
                  Criar um novo lembrete para sua lista.
                </DialogDescription>
              </DialogHeader>
              <ReminderContent closeDialog={() => setIsDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        {reminder.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum lembrete para hoje.
          </p>
        )}
        <div className="h-85 w-full flex-1 overflow-y-auto pr-0 lg:h-40">
          {reminder.map((item) => (
            <article
              key={item.id}
              className="flex items-center justify-between gap-2 py-2 bg-accent px-2 mb-2 rounded-md"
            >
              <p className="min-w-0 flex-1 truncate text-sm text-accent-foreground">
                {item.description}
              </p>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleDeleteReminder(item.id)}
              >
                <Trash className="w-3.5 h-3.5" />
              </Button>
            </article>
          ))}
        </div>
        <CardContent></CardContent>
      </Card>
    </div>
  );
}
