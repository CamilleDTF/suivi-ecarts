"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const result = await signIn("credentials", {
      identifiant,
      password,
      redirect: false,
    });
    setEnCours(false);
    if (result?.error) {
      setErreur("Identifiant ou mot de passe incorrect.");
      return;
    }
    router.push(searchParams.get("callbackUrl") ?? "/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border bg-card p-8">
        <span className="mb-6 flex size-11 items-center justify-center rounded-lg bg-sidebar text-sidebar-primary">
          <ShieldCheckIcon className="size-5" />
        </span>
        <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight">Suivi des écarts</h1>
        <p className="mb-6 text-sm text-muted-foreground">Connecte-toi pour continuer.</p>

        <label htmlFor="identifiant" className="mb-1.5 block text-sm font-medium">
          Identifiant
        </label>
        <Input
          id="identifiant"
          type="text"
          autoComplete="username"
          placeholder="Ton prénom"
          required
          value={identifiant}
          onChange={(e) => setIdentifiant(e.target.value)}
          className="mb-4 h-9"
        />

        <label htmlFor="mot-de-passe" className="mb-1.5 block text-sm font-medium">
          Mot de passe
        </label>
        <Input
          id="mot-de-passe"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 h-9"
        />

        {erreur && <p className="mb-4 text-sm text-destructive">{erreur}</p>}

        <Button type="submit" size="lg" disabled={enCours} className="w-full">
          {enCours ? "Connexion..." : "Se connecter"}
        </Button>
      </form>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionForm />
    </Suspense>
  );
}
