/**
 * Stub for Next.js's `server-only` guard.
 *
 * The real package throws at build time if a module is pulled into a client
 * bundle. That protection matters in the app and is verified by `next build`;
 * under Vitest there is no bundler, so the import is aliased to this no-op.
 */
export {};
