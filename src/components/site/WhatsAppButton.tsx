import { MessageCircle } from "lucide-react";

/** Floating chat button; only rendered when a WhatsApp number is set in Dashboard → Content. */
export function WhatsAppButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="group fixed right-4 bottom-4 z-40 flex h-14 items-center gap-2 rounded-full bg-[#1DA851] px-4 text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.45)] transition hover:bg-[#178a43] sm:right-6 sm:bottom-6 print:hidden"
    >
      <MessageCircle className="h-6 w-6" aria-hidden />
      <span className="hidden text-sm font-semibold sm:inline">WhatsApp</span>
    </a>
  );
}
