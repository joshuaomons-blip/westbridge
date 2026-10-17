import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { isLocale, locales, routing } from "./i18n/routing";
import { detectLocale } from "./lib/locale-detect";
import { updateAdminSession } from "./lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return updateAdminSession(request);
  }
  // First visit to an address without a language (e.g. norvaneexpress.com/track):
  // choose the language from the device and the visitor's country.
  const { pathname, search } = request.nextUrl;
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!hasLocale) {
    // A language the visitor picked themselves always wins over detection.
    const chosen = request.cookies.get("nv_lang")?.value;
    const locale = isLocale(chosen)
      ? chosen
      : detectLocale(request.headers.get("accept-language"), request.headers.get("x-vercel-ip-country"));
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    url.search = search;
    const res = NextResponse.redirect(url, 307);
    res.headers.set("Vary", "Accept-Language");
    return res;
  }
  return intlMiddleware(request);
}

export const config = {
  // Everything except API routes, Next.js internals and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
