import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Roda em toda request: (1) refresca a sessão do Supabase nos cookies, (2) protege
// /dashboard/* (precisa estar logado e com a conta ativa) e /admin/* (precisa estar
// logado, ser admin, e com a conta ativa).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith("/admin") && path !== "/admin/login";
  const isDashboardRoute = path.startsWith("/dashboard");

  if (isDashboardRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isDashboardRoute && user) {
    const { data: profile } = await supabase.from("profiles").select("ativo").eq("id", user.id).single();
    // Conta desativada pelo admin: derruba a sessão na hora, mesmo que o cookie de
    // login ainda esteja válido — sem isso, quem foi desativado continuava navegando
    // normalmente até o token expirar sozinho.
    if (profile && profile.ativo === false) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?desativado=1", request.url));
    }
  }

  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, ativo")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin" || profile?.ativo === false) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
