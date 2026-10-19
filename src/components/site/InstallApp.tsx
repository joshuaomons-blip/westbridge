"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * "Get the app" block: registers the service worker, offers one-tap install on
 * Android / desktop Chrome / Edge, and shows Share → Add to Home Screen steps on
 * iPhone. Hidden when the site is already running as the installed app.
 */
export function InstallApp({ title, text, button, iosHint, close }: { title: string; text: string; button: string; iosHint: string; close: string }) {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!deferred && !ios)) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      setDeferred(null);
    } else if (ios) {
      setShowIos(true);
    }
  }

  return (
    <div className="mt-6 max-w-sm rounded-xl border border-white/15 bg-white/[0.04] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-signal-600 text-white">
          <Smartphone className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-0.5 text-sm text-white/70">{text}</p>
          <button
            type="button"
            onClick={install}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-brand-900 transition hover:bg-white/90"
          >
            <Download className="h-4 w-4" aria-hidden />
            {button}
          </button>
        </div>
      </div>
      {showIos && (
        <div className="relative mt-3 rounded-lg bg-white p-3 pr-9 text-sm text-slate-800">
          <button type="button" onClick={() => setShowIos(false)} className="absolute top-2 right-2 text-slate-400 hover:text-slate-700" aria-label={close}>
            <X className="h-4 w-4" aria-hidden />
          </button>
          <p className="flex flex-wrap items-center gap-1">
            {iosHint.split("{share}").map((part, i, arr) => (
              <span key={i} className="inline-flex items-center gap-1">
                {part}
                {i < arr.length - 1 && <Share className="inline h-4 w-4 text-blue-600" aria-label="Share" />}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
