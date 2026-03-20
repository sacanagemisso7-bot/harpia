import { Card, CardContent } from "@/components/ui/card";

type NoteFeedProps = {
  notes: Array<{
    id: string;
    content: string;
    createdAt: Date;
    author: {
      name: string;
      email: string;
    };
  }>;
  emptyMessage: string;
};

export function NoteFeed({ notes, emptyMessage }: NoteFeedProps) {
  if (!notes.length) {
    return (
      <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-6 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <Card key={note.id} className="panel-hover">
          <CardContent className="space-y-4 p-5">
            <p className="text-sm leading-6 text-foreground">{note.content}</p>
            <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>{note.author.name}</span>
              <span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(note.createdAt)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
