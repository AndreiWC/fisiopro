"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Reminder } from "@/generated/prisma/client";
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
    <div className="flex flex-col gap-3">
      <Card className="p-2 gap-2">
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
          <p className="text-sm text-gray-500">Nenhum lembrete para hoje.</p>
        )}
        <ScrollArea className="h-[340px] lg:max-h-[calc(100vh-15rem)] pr-0 w-full flex-1">
          {reminder.map((item) => (
            <article
              key={item.id}
              className="flex flex-wrap flex-row items-center justify-between py-2 bg-yellow-100 px-2 mb-2 rounded-md"
            >
              <p className="text-sm text-gray-500">{item.description}</p>
              <Button
                className="bg-red-500 hover:bg-red-400 h-6 w-6 p-0 rounded-full"
                size="sm"
                onClick={() => handleDeleteReminder(item.id)}
              >
                <Trash className="w-2 h-2 text-white" />
              </Button>
            </article>
          ))}
        </ScrollArea>
        <CardContent></CardContent>
      </Card>
    </div>
  );
}
