import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const APP_ROUTES = ['/desk', '/history', '/analytics', '/risk', '/solver'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const walletConnected = request.cookies.get('blindmarkets-wallet')?.value;

  if (APP_ROUTES.some((route) => pathname.startsWith(route)) && !walletConnected) {
    return NextResponse.redirect(
      new URL(`/connect?next=${encodeURIComponent(pathname)}`, request.url),
    );
  }

  if (pathname === '/connect' && walletConnected) {
    return NextResponse.redirect(new URL('/desk', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/desk/:path*',
    '/history/:path*',
    '/analytics/:path*',
    '/risk/:path*',
    '/solver/:path*',
    '/connect',
  ],
};
