import { Logo } from "@/components/site/Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-12">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.12] [background-image:radial-gradient(#8ea6cc_1px,transparent_1px)] [background-size:22px_22px]"
        aria-hidden
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo inverted />
        </div>
        <div className="rounded-2xl bg-white p-7 shadow-2xl sm:p-8">
          <h1 className="text-xl font-bold text-navy-950">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-navy-300">Authorized personnel only. Activity is logged.</p>
      </div>
    </main>
  );
}
