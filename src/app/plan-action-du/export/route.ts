import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { referenceActionDU } from "@/lib/labels";

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
  const typeAction = searchParams.get("typeAction") || undefined;
  const responsable = searchParams.get("responsable") || undefined;

  const actions = await prisma.actionDU.findMany({
    where: { archiveLe: null, typeAction, responsable },
    orderBy: { numero: "asc" },
  });

  const entetes = [
    "N°",
    "Action",
    "Risques concernés",
    "Type d'action",
    "Responsable",
    "Preuve de réalisation",
  ];
  const lignes = actions.map((a) =>
    [
      referenceActionDU(a.numero),
      a.action,
      a.risquesConcernes ?? "",
      a.typeAction ?? "",
      a.responsable ?? "",
      // Les moyens de preuve restent un par ligne dans la cellule : le tableur
      // les garde groupés, comme dans le Document Unique.
      a.preuveRealisation ?? "",
    ]
      .map(champCsv)
      .join(";"),
  );

  const csv = "﻿" + [entetes.join(";"), ...lignes].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="plan-action-du.csv"`,
    },
  });
}
