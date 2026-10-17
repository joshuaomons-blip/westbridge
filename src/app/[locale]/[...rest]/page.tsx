import { notFound } from "next/navigation";

// Any unknown path inside a language (e.g. /en/unknown) shows the localized 404 page.
export default function CatchAll() {
  notFound();
}
