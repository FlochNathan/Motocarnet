import type { Metadata } from "next";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function ConfidentialitePage() {
  return (
    <article>
      <h1 className="text-3xl font-extrabold tracking-tight">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-ink-dim">Dernière mise à jour : à compléter à la mise en ligne.</p>

      <Section title="1. Responsable du traitement">
        Le responsable du traitement est <strong>[à compléter : nom / raison sociale de l'éditeur]</strong>,
        joignable à <strong>contact@mxvision.app</strong> (à remplacer par votre e-mail réel).
      </Section>

      <Section title="2. Données collectées">
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Adresse e-mail et informations de compte (nom de pilote, poids et niveau facultatifs).</li>
          <li>Données que vous saisissez : motos, sessions, entretiens, dépenses, réglages, photos.</li>
          <li>Données techniques minimales nécessaires au fonctionnement (cookies de session).</li>
        </ul>
      </Section>

      <Section title="3. Finalités">
        Ces données servent uniquement à fournir le Service : authentification, stockage et affichage de vos
        informations de suivi. Aucune revente de données n'est effectuée.
      </Section>

      <Section title="4. Sous-traitants">
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Supabase</strong> — authentification, base de données et stockage des fichiers.</li>
          <li><strong>Netlify</strong> — hébergement de l'application.</li>
          <li><strong>Apify</strong> — récupération des annonces publiques Facebook des terrains (page Terrains).</li>
        </ul>
      </Section>

      <Section title="5. Conservation">
        Vos données sont conservées tant que votre compte est actif. Vous pouvez les exporter ou demander leur
        suppression à tout moment.
      </Section>

      <Section title="6. Vos droits">
        Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité
        de vos données. La suppression d'une moto ou de votre compte efface les données associées. Pour toute
        demande, écrivez à l'adresse de contact ci-dessus.
      </Section>

      <Section title="7. Sécurité">
        L'accès aux données est protégé par authentification et par des règles de sécurité au niveau de la base
        (chaque utilisateur n'accède qu'à ses propres données).
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-2 leading-relaxed text-ink-dim">{children}</div>
    </section>
  );
}
