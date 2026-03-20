export default function AppLoading() {
  return (
    <div className="grid gap-6">
      <div className="h-14 w-64 animate-pulse rounded-3xl bg-white/70" />
      <div className="grid gap-5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-[1.5rem] bg-white/80" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-[1.5rem] bg-white/80" />
    </div>
  );
}
