// État partagé (mutable) entre le hero HTML et la scène 3D.
// Évite de faire transiter une ref à travers l'import dynamique du Canvas.
// Lu dans la boucle de rendu (useFrame), écrit par les écouteurs du hero.

export const scrollState = {
  heroProgress: 0, // 0 (haut du hero) → 1 (hero entièrement parcouru)
  heroVisible: true, // le hero est-il à l'écran ? (pause le rendu sinon)
};
