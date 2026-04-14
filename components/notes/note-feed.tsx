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
    return <div className="border border-dashed border-border/85 bg-card p-4 text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="grid gap-3">
      {notes.map((note) => (
        <div key={note.id} className="grid gap-3 border border-border/85 bg-card p-4">
          <p className="text-sm leading-6 text-foreground">{note.content}</p>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground">
            <span>{note.author.name}</span>
            <span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(note.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
