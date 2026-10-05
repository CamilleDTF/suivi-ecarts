"use client";

import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BoutonSupprimer({
  action,
  hiddenFields,
  message,
  label = "Supprimer",
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  message: string;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant="destructive" size="lg" className="w-full justify-start">
        <Trash2Icon />
        {label}
      </Button>
    </form>
  );
}
