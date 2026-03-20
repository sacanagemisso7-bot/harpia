import { cn } from "@/lib/utils";

type FormMessageProps = {
  message?: string;
  className?: string;
};

export function FormMessage({ message, className }: FormMessageProps) {
  if (!message) {
    return null;
  }

  return <p className={cn("text-sm text-destructive", className)}>{message}</p>;
}
