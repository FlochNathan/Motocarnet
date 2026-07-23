# Modèles 3D

Placez ici le fichier **`motocross.glb`** utilisé par la page d'accueil.

Il n'est pas encore généré (Blender n'était pas installé lors de la mise en place).
Pour le produire depuis `Image/moto3d.blend` :

1. Installez [Blender](https://www.blender.org/download/) et ajoutez-le au PATH.
2. Exportez : `npm run 3d:export`
3. Optimisez (facultatif, réduit le poids) : `npm run 3d:optimize`

Tant que `motocross.glb` est absent, la page d'accueil affiche automatiquement
un visuel de secours élégant — aucune erreur, aucun blocage.
