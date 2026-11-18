/** Katalog yuklanayotganda: mahsulot kartochkalarining skeleton panjarasi. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
            <div className="h-32 animate-pulse bg-surface-2 motion-reduce:animate-none" />
            <div className="flex flex-col gap-2 p-3.5">
              <div className="h-3 w-16 animate-pulse rounded bg-surface-2 motion-reduce:animate-none" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-surface-2 motion-reduce:animate-none" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2 motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
