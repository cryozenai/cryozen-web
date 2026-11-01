/**
 * The commit this deployment was built from, so `scripts/check-production.mjs`
 * can compare production with main without Vercel credentials. Prerendered at
 * build, so it names the build rather than the request. Vercel sets the variable
 * only for git-integrated builds; null means the deployment does not say.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json({ commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null });
}
