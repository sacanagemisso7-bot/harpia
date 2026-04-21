export default function AppLoading() {
  return (
    <div className="page-stage grid gap-4" aria-label="Carregando Harpia">
      <div className="loading-shell h-12 w-72 rounded-[0.28rem] border border-border/60 bg-card/60" />
      <div className="grid gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="loading-shell h-24 rounded-[0.28rem] border border-border/60 bg-card/60" />
        ))}
      </div>
      <div className="loading-shell h-80 rounded-[0.28rem] border border-border/60 bg-card/60" />
    </div>
  );
}
