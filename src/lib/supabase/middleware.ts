import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/auth"];

/**
 * Refreshes the Supabase session cookie for /admin routes and sends signed-out
 * visitors to the login page. This is a convenience only — every admin page
 * and action independently verifies the user and their permissions on the server.
 */
export async function updateAdminSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = env.supabaseUrl;
  const anonKey = env.supabaseAnonKey;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_ADMIN_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    return NextResponse.redirect(login);
  }
  if (path === "/admin" || path === "/admin/") {
    const dash = request.nextUrl.clone();
    dash.pathname = user ? "/admin/dashboard" : "/admin/login";
    return NextResponse.redirect(dash);
  }
  return response;
}
