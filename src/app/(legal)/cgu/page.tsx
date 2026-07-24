import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions générales d'utilisation" };

export default function CGUPage() {
  return (
    <article className="prose-legal">
      <h1 className="text-3xl font-extrabold tracking-tight">Conditions générales d'utilisation</h1>
      <p className="mt-2 text-sm text-ink-dim">Dernière mise à jour : à compléter à la mise en ligne.</p>

      <Section title="1. Objet">
        MXVision (« le Service ») est une application de suivi de motos permettant de gérer les entretiens,
        les heures moteur, les dépenses, les réglages et l'historique d'une ou plusieurs motos. Les présentes
        conditions régissent l'utilisation du Service.
      </Section>

      <Section title="2. Éditeur">
        Le Service est édité par <strong>[à compléter : nom / raison sociale de l'éditeur]</strong>,
        contact : <strong>contact@mxvision.app</strong> (à remplacer par votre e-mail réel).
      </Section>

      <Section title="3. Compte">
        L'accès aux fonctionnalités nécessite la création d'un compte avec une adresse e-mail valide.
        Vous êtes responsable de la confidentialité de vos identifiants et des activités réalisées depuis votre compte.
      </Section>

      <Section title="4. Utilisation du Service">
        Vous vous engagez à utiliser le Service conformément à la loi et à ne pas porter atteinte à son bon
        fonctionnement. Les recommandations d'entretien et de réglage fournies sont indicatives : elles ne
        remplacent ni le manuel du constructeur, ni l'avis d'un professionnel.
      </Section>

      <Section title="5. Données">
        Le traitement de vos données personnelles est décrit dans la
        {" "}<a href="/confidentialite" className="font-semibold text-accent-strong">politique de confidentialité</a>.
      </Section>

      <Section title="6. Disponibilité">
        Le Service est fourni « en l'état », sans garantie de disponibilité continue. L'éditeur ne saurait être
        tenu responsable des pertes de données ; il vous appartient d'exporter régulièrement vos données depuis
        votre profil.
      </Section>

      <Section title="7. Modification">
        Les présentes conditions peuvent être mises à jour. La version en vigueur est celle publiée sur cette page.
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 leading-relaxed text-ink-dim">{children}</p>
    </section>
  );
}
