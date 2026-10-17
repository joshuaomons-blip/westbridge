"use client";

import { useActionState, useRef, startTransition } from "react";
import { TriangleAlert, LoaderCircle } from "lucide-react";
import type { ActionResult } from "@/actions/admin/_util";
import { cn } from "@/lib/format";

/**
 * A button that asks for confirmation in a dialog before running a server action.
 * Used for archiving, restoring, voiding, publishing and other significant changes.
 */
export function ConfirmForm({
  action,
  hidden,
  label,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  buttonClassName,
  icon,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  hidden: Record<string, string>;
  label: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  buttonClassName?: string;
  icon?: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, dispatch, pending] = useActionState(async (prev: ActionResult, fd: FormData) => {
    const r = await action(prev, fd);
    if (!r.error) dialog.current?.close();
    return r;
  }, {});

  return (
    <>
      <button type="button" className={buttonClassName ?? "btn-outline"} onClick={() => dialog.current?.showModal()}>
        {icon}
        {label}
      </button>
      {state.error && <p className="mt-2 text-sm text-red-600" role="alert">{state.error}</p>}
      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 p-0 shadow-2xl backdrop:bg-navy-950/50"
        aria-labelledby="confirm-title"
      >
        <form
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => dispatch(fd));
          }}
        >
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <div className="flex gap-4">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                tone === "danger" ? "bg-red-100 text-red-600" : "bg-navy-100 text-navy-700",
              )}
            >
              <TriangleAlert className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 id="confirm-title" className="text-base font-semibold text-slate-900">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">{description}</p>
            </div>
          </div>
          {state.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn-outline" onClick={() => dialog.current?.close()} disabled={pending}>
              Cancel
            </button>
            <button type="submit" className={tone === "danger" ? "btn-danger" : "btn-primary"} disabled={pending}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
              {confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
