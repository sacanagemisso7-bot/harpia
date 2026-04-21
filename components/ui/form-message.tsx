import { cn } from "@/lib/utils";

type FormMessageProps = {
  message?: string;
  className?: string;
};

export function FormMessage({ message, className }: FormMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={cn(
        "rounded-[0.28rem] border border-destructive/18 bg-destructive/10 px-3 py-2 text-sm text-destructive",
        className
      )}
    >
      {message}
    </p>
  );
}
