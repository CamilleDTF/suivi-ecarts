import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { TYPES_FICHE_EXTERNE } from "@/lib/fiche-externe";

// Sert la fiche de diffusion déposée sur un REX. Le contenu n'est lu qu'ici : jamais avec la fiche ou la liste.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Non autorisé", { status: 401 });

  const { id } = await params;
  const document = await prisma.rexDocument.findUnique({ where: { rexId: id } });
  if (!document) return new Response("Aucune fiche de diffusion jointe", { status: 404 });

  // Un PDF ou une image s'ouvre dans l'onglet ; le reste se télécharge. `?telecharger=1` force le téléchargement.
  const telecharger =
    new URL(request.url).searchParams.get("telecharger") === "1" ||
    !TYPES_FICHE_EXTERNE[document.type]?.ouvrableDansLeNavigateur;

  return new Response(new Uint8Array(document.contenu), {
    headers: {
      "Content-Type": document.type,
      "Content-Length": String(document.taille),
      "Content-Disposition": `${telecharger ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(document.nom)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
