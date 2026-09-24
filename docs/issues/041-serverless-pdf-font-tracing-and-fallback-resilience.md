# Issue 041: Serverless PDF Font Tracing & Fallback Resilience

## What to build
Ensure `@react-pdf/renderer` generates binary PDF passes reliably in Vercel Serverless Functions (`/var/task`) without throwing `ENOENT` on font resolution. Configure Next.js serverless file tracing (`outputFileTracingIncludes`) in `next.config.ts` so `public/fonts` are bundled in the Lambda container. Update `src/components/PassPDF.tsx` with dynamic multi-path candidate checking, remote CDN fallback, and standard Helvetica/sans-serif fallback so card generation never crashes.

## Acceptance criteria
- [ ] `next.config.ts` defines `outputFileTracingIncludes` targeting `public/fonts/**/*` across all serverless routes.
- [ ] `src/components/PassPDF.tsx` resolves font paths across `process.cwd()`, relative paths, and CDN URL fallback.
- [ ] If custom Devanagari font cannot be loaded, `@react-pdf/renderer` falls back gracefully to standard Helvetica/Arial without throwing `ENOENT`.
- [ ] Pass image loading handles invalid or unreachable URLs gracefully without aborting the PDF render.
- [ ] `renderToBuffer` succeeds on both local Node.js and simulated serverless paths without throwing unhandled exceptions.

## Blocked by
- None
