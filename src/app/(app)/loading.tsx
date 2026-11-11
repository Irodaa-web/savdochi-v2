/**
 * Sahifa almashganda darhol ko'rsatiladigan skelet: menyu bosilishi bilan javob beradi,
 * server ma'lumotni tayyorlaguncha "qotib qolgan" tuyulmaydi.
 */
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-busy="true" aria-live="polite">
      <div className="h-8 w-56 rounded-lg bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[84px] rounded-xl border border-line bg-surface" />
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl border border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}
