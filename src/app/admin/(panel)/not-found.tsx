import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">Record not found</h1>
      <p className="mt-2 text-sm text-slate-600">It may have been removed, or your role cannot see it.</p>
      <Link href="/admin/dashboard" className="btn-primary mt-6">Back to overview</Link>
    </div>
  );
}
