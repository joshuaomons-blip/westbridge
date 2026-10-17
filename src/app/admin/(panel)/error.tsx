"use client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">This page could not be loaded</h1>
      <p className="mt-2 text-sm text-slate-600">
        The database may be temporarily unavailable. No changes were lost. {error.digest && <span className="block font-mono text-xs text-slate-400">Ref: {error.digest}</span>}
      </p>
      <button type="button" onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
