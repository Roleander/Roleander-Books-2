import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    // Use demo credentials for testing when real ones aren't available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://demo.supabase.co"
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo_key_for_testing"

    console.log("[v0] Middleware - Supabase URL exists:", !!supabaseUrl)
    console.log("[v0] Middleware - Supabase Anon Key exists:", !!supabaseAnonKey)

    // Skip authentication for demo mode
    if (supabaseUrl === "https://demo.supabase.co") {
      console.log("[v0] Demo mode - skipping authentication")
      return NextResponse.next({
        request,
      })
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[v0] Middleware error: Missing Supabase environment variables")
      console.error("[v0] NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "SET" : "MISSING")
      console.error("[v0] NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "SET" : "MISSING")
      // Allow request to continue without authentication if Supabase is not configured
      return NextResponse.next({
        request,
      })
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("[v0] Middleware - User authenticated:", !!user)
    console.log("[v0] Middleware - Current path:", request.nextUrl.pathname)

    if (
      request.nextUrl.pathname !== "/" &&
      !user &&
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/admin") &&
      !request.nextUrl.pathname.startsWith("/library")
    ) {
      console.log("[v0] Middleware - Redirecting to login")
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error("[v0] Middleware error:", error)
    return NextResponse.next({
      request,
    })
  }
}
