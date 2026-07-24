import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { StatutAction } from "@/generated/prisma/enums";
import { STATUT_ACTION_LABELS, TYPE_ACTION_LABELS } from "@/lib/labels";

function champCsv(valeur: string): string {
  if (/[",\n;]/.test(valeur)) {
    return `"${valeur.replace(/"/g, '""')}"`;
  }
  return valeur;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Non autorisé", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statut = searchParams.get("statut") || undefined;
  const responsable = searchParams.get("responsable") || undefined;

  const actions = await prisma.action.findMany({
    where: {
      statut: statut ? (statut as StatutAction) : undefined,
      responsable: responsable || undefined,
    },
    orderBy: { echeance: "asc" },
    include: { ecart: true, ficheSSE: true, ecartAmiante: true },
  });

  function rattacheA(a: (typeof actions)[number]): string {
    if (a.ecart) return a.ecart.reference;
    if (a.ficheSSE) return a.ficheSSE.reference;
    if (a.ecartAmiante) return a.ecartAmiante.reference;
    return "";
  }

  const entetes = ["Référence", "Rattaché à", "Type", "Action", "Responsable", "Échéance", "Statut"];
  const lignes = actions.map((a) =>
    [
      a.reference,
      rattacheA(a),
      TYPE_ACTION_LABELS[a.type],
      a.action,
      a.responsable,
      a.echeance ? a.echeance.toLocaleDateString("fr-FR") : "",
      STATUT_ACTION_LABELS[a.statut],
    ]
      .map(champCsv)
      .join(";"),
  );

  const csv = "﻿" + [entetes.join(";"), ...lignes].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="plan-action.csv"`,
    },
  });
}
