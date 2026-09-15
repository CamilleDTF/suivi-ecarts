-- Reprise du plan d'action du Document Unique tel qu'il existe aujourd'hui :
-- PA1 à PA8, dans l'ordre et avec les numéros du document, auxquels les fiches
-- de risques renvoient.
--
-- Ces huit lignes passent par une migration et non par un script de seed : le
-- déploiement joue déjà `prisma migrate deploy`, donc la reprise se fait en
-- production sans manipulation, une seule fois, et à la même date que la table
-- qui les accueille. Les identifiants sont fixes pour la même raison — rejouer
-- la migration sur une base déjà reprise ne doit rien dupliquer.
--
-- Le texte est repris mot pour mot du DU, coquilles comprises : c'est le
-- document qui fait foi, et la correction se fait depuis l'application.

INSERT INTO "ActionDU" (
  "id", "numero", "action", "risquesConcernes", "typeAction", "responsable",
  "preuveRealisation", "createdAt", "updatedAt"
)
VALUES
  (
    'du-pa1', 1,
    'Rappel périodique des règles de sécurité lors des réunions internes et accueils sécurité',
    'A1, A2, B1, B4, B26, C1, C4, D3',
    'Action permanente', 'Direction',
    E'Accueil sécurité\nCauserie\nMail\nQuiz mensuel\nAudit interne chantier',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'du-pa2', 2,
    'Sensibilisation du personnel aux bonnes pratiques et procédures SSE',
    'B24, B25, B36, C32, C34, E3 à E15, E21, E28, E35 à E37, E44, E45, E50, F9 à F13',
    'Action permanente', 'Direction',
    E'Causerie\nMail\nQuiz mensuel\nAudit interne chantier',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'du-pa3', 3,
    'Renforcement des contrôles terrain par l''encadrement',
    'A22, C14, C16, C39, D9, F17, G11, G13, G15, G16',
    'Action permanente', 'Encadrement',
    E'Groupe WhatsApp\nAudit interne\nAudit interne chantier',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'du-pa4', 4,
    'Vérification périodique de l''état du matériel et des installations',
    'B6, B15, C18, D17',
    'Action permanente', 'Encadrement',
    E'Groupe WhatsApp\nTableau de suivi\nAudit interne dépôt',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'du-pa5', 5,
    'Vérification du respect des procédures amiante',
    'B31, D27, C26, C28, C29, C38',
    'Action permanente', 'Encadrement',
    E'Audit interne\nVisite chantier',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'du-pa6', 6,
    'Vérification de la mise en sécurité des zones de travail',
    'C3, D2, D21',
    'Action permanente', 'Encadrement',
    'Fiche chantier',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'du-pa7', 7,
    'Vérification de la sécurisation et du balisage des zones de chantier afin d''empecher les intrusions',
    'C14, D9',
    'Action ponctuelle', 'Conducteur de travaux / Chef de chantier',
    'Voir Action 2026-EV04',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'du-pa8', 8,
    'Sensibilisation du personnel et ajout de ce risque dans l''analyse de risque du PRA.',
    'E52 & E53',
    'Action ponctuelle', 'Resp. QHSE',
    'Voir réunion travaux N°63 & trame PRA mise à jour',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO NOTHING;

-- Le compteur repart après PA8 : la prochaine action créée depuis
-- l'application sera PA9, et non PA1 par-dessus une ligne existante.
-- GREATEST, au cas où des actions auraient déjà été saisies à la main avant
-- cette reprise : le compteur ne doit jamais redescendre.
INSERT INTO "ReferenceCounter" ("entite", "annee", "valeur")
VALUES ('ActionDU', 0, 8)
ON CONFLICT ("entite", "annee")
DO UPDATE SET "valeur" = GREATEST("ReferenceCounter"."valeur", 8);
