import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import donnees from "./import-data/donnees-2026-07.json";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function generateReference(entite: string, prefixe: string) {
  const annee = new Date().getFullYear();
  const rows = await prisma.$queryRaw<{ valeur: number }[]>`
    INSERT INTO "ReferenceCounter" ("entite", "annee", "valeur")
    VALUES (${entite}, ${annee}, 1)
    ON CONFLICT ("entite", "annee")
    DO UPDATE SET "valeur" = "ReferenceCounter"."valeur" + 1
    RETURNING "valeur"
  `;
  return `${prefixe}-${annee}-${String(rows[0].valeur).padStart(4, "0")}`;
}

function versDate(iso: string | null | undefined): Date | undefined {
  return iso ? new Date(iso) : undefined;
}

async function supprimerDonneesDeDemo() {
  const demo = await prisma.dossier.findFirst({ where: { chantier: "Chantier Nord — Lot 3" } });
  if (!demo) return;

  console.log("Suppression des données de démonstration…");
  const ecarts = await prisma.ecart.findMany({ where: { dossierId: demo.id } });
  const ecartIds = ecarts.map((e) => e.id);

  const fiches = await prisma.ficheSSE.findMany({ where: { ecartId: { in: ecartIds } } });
  const ficheIds = fiches.map((f) => f.id);

  await prisma.causeArbre.updateMany({ where: { ficheSSEId: { in: ficheIds } }, data: { parentId: null } });
  await prisma.causeArbre.deleteMany({ where: { ficheSSEId: { in: ficheIds } } });
  await prisma.action.deleteMany({
    where: { OR: [{ ecartId: { in: ecartIds } }, { ficheSSEId: { in: ficheIds } }] },
  });
  await prisma.ficheSSE.deleteMany({ where: { id: { in: ficheIds } } });
  await prisma.ecart.deleteMany({ where: { id: { in: ecartIds } } });
  await prisma.dossier.delete({ where: { id: demo.id } });
  console.log("Données de démonstration supprimées.");
}

async function main() {
  const dejaImporte = await prisma.dossier.findUnique({ where: { id: donnees.dossiers[0].idExcel } });
  if (dejaImporte) {
    console.log("Import Excel déjà effectué, aucune action.");
    return;
  }

  await supprimerDonneesDeDemo();

  console.log(`Import de ${donnees.dossiers.length} dossiers…`);
  for (const d of donnees.dossiers) {
    await prisma.dossier.create({
      data: {
        id: d.idExcel,
        reference: await generateReference("Dossier", "D"),
        dateDetection: new Date(d.dateDetection),
        origine: d.origine as never,
        statut: d.statut as never,
        declarant: d.declarant,
        chantier: d.chantier,
      },
    });
  }

  console.log(`Import de ${donnees.ecartAmiante.length} écarts amiante…`);
  for (const e of donnees.ecartAmiante) {
    await prisma.ecartAmiante.create({
      data: {
        id: e.idExcel,
        reference: await generateReference("EcartAmiante", "EA"),
        date: new Date(e.date),
        nomChantier: e.nomChantier,
        numeroChantier: e.numeroChantier,
        conducteur: e.conducteur,
        chef: e.chef,
        zone: e.zone,
        processus: e.processus,
        typeAnalyse: e.typeAnalyse,
        referenceAnalyse: e.referenceAnalyse,
        typeEcart: e.typeEcart,
        resultatAttendu: e.resultatAttendu,
        resultatObtenu: e.resultatObtenu,
        description: e.description,
        expositionAccidentelle: e.expositionAccidentelle ?? undefined,
        personneConcernee: e.personneConcernee,
        fie: e.fie ?? undefined,
        medecinTravail: e.medecinTravail,
        besoinNouvelleAnalyse: e.besoinNouvelleAnalyse ?? undefined,
        pasNouvelleAnalyse: e.pasNouvelleAnalyse,
        dateNouvelleAnalyse: versDate(e.dateNouvelleAnalyse),
        laboratoireNouvelleAnalyse: e.laboratoireNouvelleAnalyse,
        chantierNouvelleAnalyse: e.chantierNouvelleAnalyse,
        resultatAttenduNouvelleAnalyse: e.resultatAttenduNouvelleAnalyse,
        resultatObtenuNouvelleAnalyse: e.resultatObtenuNouvelleAnalyse,
        actionCloture: e.actionCloture,
        clotureEcartAmiante: e.clotureEcartAmiante,
        dateCloture: versDate(e.dateCloture),
        evenementSSE: e.evenementSSE,
      },
    });
  }

  console.log(`Import de ${donnees.ecarts.length} écarts…`);
  for (const e of donnees.ecarts) {
    await prisma.ecart.create({
      data: {
        id: e.idExcel,
        reference: await generateReference("Ecart", "EC"),
        dossierId: e.dossierIdExcel,
        dateDetection: new Date(e.dateDetection),
        origine: e.origine as never,
        statut: e.statut as never,
        declarant: e.declarant,
        typeActivite: e.typeActivite as never,
        natures: e.natures,
        domaines: e.domaines,
        pointsSensibles: e.pointsSensibles,
        graviteReelle: e.graviteReelle,
        gravitePotentielle: e.gravitePotentielle,
        frequence: e.frequence,
        description: e.description,
        mesureImmediate: e.mesureImmediate,
        cause: e.cause,
        critereEfficacite: e.critereEfficacite,
        ficheSSECreee: e.ficheSSECreee,
      },
    });
  }

  console.log(`Import de ${donnees.fiches.length} fiches SSE…`);
  for (const f of donnees.fiches) {
    await prisma.ficheSSE.create({
      data: {
        id: f.idExcel,
        reference: await generateReference("FicheSSE", "EV"),
        ecartId: f.ecartIdExcel,
        ecartAmianteId: f.ecartAmianteIdExcel,
        typeEvenement: f.typeEvenement,
        numeroInterne: f.numeroInterne,
        statutFiche: f.statutFiche as never,
        emetteur: f.emetteur,
        nomChantier: f.nomChantier,
        dateHeure: versDate(f.dateHeure),
        lieuZone: f.lieuZone,
        personnesImpliquees: f.personnesImpliquees,
        temoins: f.temoins,
        declarationExterneNecessaire: f.declarationExterneNecessaire ?? undefined,
        declarationExterneA: f.declarationExterneA,
        descriptionFactuelle: f.descriptionFactuelle,
        gravite: f.gravite,
        frequence: f.frequence,
        criticite: f.criticite,
        typeAnalyse: f.typeAnalyse,
        toutesActionsCloturees: f.toutesActionsCloturees ?? undefined,
        miseAJourNecessaire: f.miseAJourNecessaire,
        procedureLaquelle: f.procedureLaquelle,
        referenceDUERP: f.referenceDUERP,
        nouveauRisqueNecessaire: f.nouveauRisqueNecessaire ?? undefined,
        referenceNouveauRisque: f.referenceNouveauRisque,
        communicationInterne: f.communicationInterne ?? undefined,
        typeCommunication: f.typeCommunication,
        validationNom: f.validationNom,
        validationFonction: f.validationFonction,
        validationDate: versDate(f.validationDate),
        mesuresImmediatesPrises: f.mesuresImmediatesPrises,
        dateEnvoi: versDate(f.dateEnvoi),
        domaine: f.domaine,
        theme: f.theme,
        referencePreuve: f.referencePreuve,
      },
    });
  }

  console.log(`Import de ${donnees.actions.length} actions…`);
  for (const a of donnees.actions) {
    await prisma.action.create({
      data: {
        id: a.idExcel,
        reference: await generateReference("Action", "ACT"),
        ecartId: a.ecartIdExcel,
        ficheSSEId: a.ficheSSEIdExcel,
        ecartAmianteId: a.ecartAmianteIdExcel,
        type: a.type as never,
        action: a.action,
        responsable: a.responsable,
        echeance: versDate(a.echeance),
        statut: a.statut as never,
        obligatoire: a.obligatoire,
        preuve: a.preuve,
        verifEfficacite: a.verifEfficacite,
        origine: a.origine,
      },
    });
  }

  console.log(`Import de ${donnees.causes.length} causes…`);
  type CauseAImporter = (typeof donnees.causes)[number];
  const restantes: CauseAImporter[] = [...donnees.causes];
  const creees = new Set<string>();
  while (restantes.length > 0) {
    const pretes = restantes.filter((c) => !c.parentIdExcel || creees.has(c.parentIdExcel));
    if (pretes.length === 0) {
      console.warn(`${restantes.length} cause(s) non importée(s) : parent introuvable`, restantes);
      break;
    }
    for (const c of pretes) {
      await prisma.causeArbre.create({
        data: {
          id: c.idExcel,
          ficheSSEId: c.ficheSSEIdExcel,
          parentId: c.parentIdExcel,
          libelle: c.libelle,
          estCauseRacine: c.estCauseRacine,
        },
      });
      creees.add(c.idExcel);
      restantes.splice(restantes.indexOf(c), 1);
    }
  }

  console.log("Import terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
