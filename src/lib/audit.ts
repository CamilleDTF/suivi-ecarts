import type { Session } from "next-auth";

export function nomAuteur(session: Session): string {
  return session.user?.name || session.user?.email || "Utilisateur";
}
