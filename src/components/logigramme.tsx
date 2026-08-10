import { Fragment } from "react";

/**
 * Logigramme des liens entre enregistrements, en SVG rendu côté serveur.
 *
 * SVG plutôt que des boîtes HTML : les connecteurs coudés entre niveaux ne se
 * dessinent pas proprement en CSS, et un SVG s'imprime tel quel, à la bonne
 * échelle, sans dépendre de JavaScript côté navigateur.
 */
export type NoeudLogigramme = {
  id: string;
  titre: string;
  sousTitre?: string | null;
  etat?: string | null;
  ton: keyof typeof TONS;
  enfants?: NoeudLogigramme[];
};

// Fonds clairs et texte foncé : une imprimante noir et blanc rend les aplats
// sombres en gris uniforme, où le texte disparaît.
const TONS = {
  dossier: { fond: "#0f172a", bord: "#0f172a", texte: "#ffffff", second: "#cbd5e1" },
  ecart: { fond: "#eff6ff", bord: "#93c5fd", texte: "#1e3a8a", second: "#3b6bb5" },
  amiante: { fond: "#f5f3ff", bord: "#c4b5fd", texte: "#4c1d95", second: "#6d4aad" },
  evenement: { fond: "#fff7ed", bord: "#fdba74", texte: "#7c2d12", second: "#a45336" },
  action: { fond: "#f0fdf4", bord: "#86efac", texte: "#14532d", second: "#3d7a52" },
} as const;

const LARGEUR = 200;
const HAUTEUR = 52;
const ESPACE_X = 54;
const ESPACE_Y = 12;

type Place = NoeudLogigramme & { x: number; y: number };

/**
 * Une ligne par feuille, un parent centré sur ses enfants : la disposition
 * classique d'un arbre, qui garde chaque branche lisible sans chevauchement.
 */
function disposer(racines: NoeudLogigramme[]) {
  const places: Place[] = [];
  const liens: { de: Place; vers: Place }[] = [];
  let ligne = 0;

  function placer(noeud: NoeudLogigramme, profondeur: number): Place {
    const enfants = noeud.enfants ?? [];
    let y: number;
    let poses: Place[] = [];
    if (enfants.length === 0) {
      y = ligne * (HAUTEUR + ESPACE_Y);
      ligne += 1;
    } else {
      poses = enfants.map((e) => placer(e, profondeur + 1));
      y = (poses[0].y + poses[poses.length - 1].y) / 2;
    }
    const place: Place = { ...noeud, x: profondeur * (LARGEUR + ESPACE_X), y };
    places.push(place);
    for (const p of poses) liens.push({ de: place, vers: p });
    return place;
  }

  for (const r of racines) placer(r, 0);

  const largeur = Math.max(...places.map((p) => p.x + LARGEUR), LARGEUR);
  const hauteur = Math.max(...places.map((p) => p.y + HAUTEUR), HAUTEUR);
  return { places, liens, largeur, hauteur };
}

/** SVG ne coupe pas le texte : on le tronque nous-mêmes. */
function tronquer(texte: string, max: number) {
  const propre = texte.trim().replace(/\s+/g, " ");
  return propre.length > max ? `${propre.slice(0, max - 1)}…` : propre;
}

function Connecteur({ de, vers }: { de: Place; vers: Place }) {
  const x1 = de.x + LARGEUR;
  const y1 = de.y + HAUTEUR / 2;
  const x2 = vers.x;
  const y2 = vers.y + HAUTEUR / 2;
  const milieu = x1 + ESPACE_X / 2;
  // Tracé en équerre : une diagonale se lit mal quand plusieurs branches
  // partent du même parent.
  return (
    <path
      d={`M ${x1} ${y1} H ${milieu} V ${y2} H ${x2}`}
      fill="none"
      stroke="#94a3b8"
      strokeWidth={1.2}
    />
  );
}

export function Logigramme({
  racines,
  legende,
}: {
  racines: NoeudLogigramme[];
  legende?: { ton: keyof typeof TONS; libelle: string }[];
}) {
  if (racines.length === 0) return null;
  const { places, liens, largeur, hauteur } = disposer(racines);

  return (
    <figure className="break-inside-avoid">
      <svg
        viewBox={`-2 -2 ${largeur + 4} ${hauteur + 4}`}
        className="h-auto w-full"
        style={{ maxWidth: largeur + 4, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
        role="img"
        aria-label="Logigramme des liens entre les enregistrements"
      >
        {liens.map((l, i) => (
          <Connecteur key={i} de={l.de} vers={l.vers} />
        ))}
        {places.map((p) => {
          const t = TONS[p.ton];
          return (
            <Fragment key={p.id}>
              <rect
                x={p.x}
                y={p.y}
                width={LARGEUR}
                height={HAUTEUR}
                rx={6}
                fill={t.fond}
                stroke={t.bord}
                strokeWidth={1}
              />
              <text x={p.x + 10} y={p.y + 19} fontSize={11.5} fontWeight={600} fill={t.texte}>
                {tronquer(p.titre, 28)}
              </text>
              {p.sousTitre && (
                <text x={p.x + 10} y={p.y + 33} fontSize={9.5} fill={t.second}>
                  {tronquer(p.sousTitre, 34)}
                </text>
              )}
              {p.etat && (
                <text x={p.x + 10} y={p.y + 45} fontSize={9} fill={t.second} fontStyle="italic">
                  {tronquer(p.etat, 34)}
                </text>
              )}
            </Fragment>
          );
        })}
      </svg>

      {legende && (
        <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          {legende.map((l) => (
            <span key={l.ton} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-sm border"
                style={{
                  background: TONS[l.ton].fond,
                  borderColor: TONS[l.ton].bord,
                  printColorAdjust: "exact",
                  WebkitPrintColorAdjust: "exact",
                }}
              />
              {l.libelle}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
