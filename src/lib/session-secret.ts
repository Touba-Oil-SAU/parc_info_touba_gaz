/**
 * Source unique de la clé de signature des sessions.
 * Partagée par src/lib/auth.ts (signature) et src/proxy.ts (vérification) :
 * les deux DOIVENT utiliser exactement la même valeur.
 */
const FALLBACK_SECRET =
  process.env.NODE_ENV === "production"
    ? "touba-gaz-prod-secret-fallback-please-set-session-secret-env"
    : "touba-gaz-dev-only-secret-do-not-use-in-production-random-98124";

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  console.warn("[auth] SESSION_SECRET non défini : utilisation d'une clé de secours. Définissez SESSION_SECRET en production.");
}

export const SESSION_SECRET = process.env.SESSION_SECRET || FALLBACK_SECRET;
export const SESSION_COOKIE_NAME = "touba_gaz_session";
