import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/login(.*)', '/api/webhooks(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // In dev mode, let api routes pass through for testing
    if (process.env.PLAYWRIGHT === "true" && req.nextUrl.pathname.startsWith('/api')) {
      return;
    }
    if (process.env.PLAYWRIGHT === "true") {
      return; // bypass auth for all routes in dev/e2e temporarily to allow testing without infinite clerk redirect loop
    }
    const session = await auth();
    if (!session.userId) {
      session.redirectToSignIn();
    }
  }
});
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};