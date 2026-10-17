import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { locales, type Locale } from "./routing";
import { getTranslationOverrides } from "@/lib/translations";

type Messages = Record<string, unknown>;

async function loadMessages(locale: Locale): Promise<Messages> {
  return (await import(`../../messages/${locale}.json`)).default as Messages;
}

/** Sets a dotted key ("tracking.title") inside a nested messages object. */
function setDeep(target: Messages, dottedKey: string, value: string) {
  const parts = dottedKey.split(".");
  let node: Messages = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = node[parts[i]];
    if (typeof next !== "object" || next === null) return; // only override existing keys
    node = next as Messages;
  }
  const last = parts[parts.length - 1];
  if (typeof node[last] === "string") node[last] = value;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = hasLocale(locales, requested) ? requested : "en";

  const base = structuredClone(await loadMessages(locale));
  // English fills any key missing from a translation file.
  const messages =
    locale === "en" ? base : mergeMissing(base, await loadMessages("en"));

  // Published overrides edited in Dashboard -> Languages & Translations.
  for (const o of await getTranslationOverrides(locale)) {
    setDeep(messages, o.message_key, o.value);
  }

  return { locale, messages, timeZone: "UTC" };
});

function mergeMissing(target: Messages, fallback: Messages): Messages {
  for (const [k, v] of Object.entries(fallback)) {
    if (!(k in target)) target[k] = structuredClone(v);
    else if (typeof v === "object" && v !== null && typeof target[k] === "object" && target[k] !== null) {
      mergeMissing(target[k] as Messages, v as Messages);
    }
  }
  return target;
}
