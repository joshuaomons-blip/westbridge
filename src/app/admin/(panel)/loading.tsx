export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-navy-200 border-t-navy-800" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
