/**
 * Orqa fon: yumshoq gradient, sekin suzib yuradigan ko'k nur dog'lari va nozik nuqtali to'r.
 * Butun ekran bo'ylab, kontent ortida. Shisha (glass) yuzalar shu fon ustida "jonlanadi".
 */
export function Aurora() {
  return (
    <div aria-hidden className="aurora pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <span className="aurora-blob aurora-1" />
      <span className="aurora-blob aurora-2" />
      <span className="aurora-blob aurora-3" />
      <span className="aurora-grid" />
    </div>
  );
}
