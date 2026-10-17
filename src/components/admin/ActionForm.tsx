"use client";

import { createContext, useActionState, useContext, useEffect, useRef, startTransition } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import type { ActionResult } from "@/actions/admin/_util";
import { cn } from "@/lib/format";

const Ctx = createContext<ActionResult>({});

type Props = {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  /** Clear the inputs after a successful submit (for "create" forms). */
  resetOnSuccess?: boolean;
  /** Hide the success/error banner (when the form shows its own). */
  quiet?: boolean;
  id?: string;
  encType?: "multipart/form-data";
};

/**
 * Form wrapper for server actions. Submits without React's automatic form
 * reset, so typed values survive validation errors, and shows the result.
 */
export function ActionForm({ action, children, className, resetOnSuccess, quiet, id, encType }: Props) {
  const [state, dispatch, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <Ctx.Provider value={state}>
      <form
        id={id}
        ref={ref}
        encType={encType}
        noValidate
        aria-busy={pending}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
          startTransition(() => dispatch(fd));
        }}
      >
        {!quiet && <FormMessage state={state} />}
        <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      </form>
    </Ctx.Provider>
  );
}

const PendingContext = createContext(false);

export function FormMessage({ state }: { state: ActionResult }) {
  if (state.error)
    return (
      <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{state.error}</span>
      </div>
    );
  if (state.ok && state.message)
    return (
      <div role="status" className="mb-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{state.message}</span>
      </div>
    );
  if (state.fields && Object.keys(state.fields).length > 0)
    return (
      <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
        Please correct the highlighted fields.
      </div>
    );
  return null;
}

export function FieldError({ name }: { name: string }) {
  const state = useContext(Ctx);
  const msg = state.fields?.[name];
  if (!msg) return null;
  return (
    <p className="field-error" id={`${name}-error`}>
      {msg}
    </p>
  );
}

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingText,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  name?: string;
  value?: string;
}) {
  const pending = useContext(PendingContext);
  const status = useFormStatus();
  const busy = pending || status.pending;
  return (
    <button type="submit" disabled={busy} className={cn(className)} name={name} value={value}>
      {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
      {busy && pendingText ? pendingText : children}
    </button>
  );
}
