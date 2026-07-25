import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"
import type { NextProxy } from "next/server"

export const proxy: NextProxy = async (req: NextRequest) => {
  const isAuthPage = req.nextUrl.pathname === "/login"

  const token = await getToken({ req })

  if (isAuthPage) {
    if (token) {
      const newUrl = new URL("/", req.nextUrl)
      return Response.redirect(newUrl)
    }
    return
  }

  if (!token) {
    const loginUrl = new URL("/login", req.nextUrl)
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return Response.redirect(loginUrl)
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
