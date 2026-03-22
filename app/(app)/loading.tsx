export default function AppLoading() {
  return (
    <div className="page-stage grid gap-6">
      <div className="loading-shell h-16 w-72 rounded-[1.6rem] border border-white/[0.08] bg-white/[0.04]" />
      <div className="grid gap-5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="loading-shell h-44 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04]" />
        ))}
      </div>
      <div className="loading-shell h-96 rounded-[1.6rem] border border-white/[0.08] bg-white/[0.04]" />
    </div>
  );
}
