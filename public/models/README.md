# Modèles 3D

**`motocross.glb`** est le modèle utilisé par la page d'accueil (généré depuis
`Image/moto3d.blend`, ~0,7 Mo, caméras/lumières retirées).

Pour le régénérer après une modification du fichier Blender :

```bash
npm run 3d:export     # Image/moto3d.blend → public/models/motocross.glb
npm run 3d:optimize   # facultatif : textures 2K, nettoyage (nécessite le réseau)
```

`npm run 3d:export` localise Blender automatiquement (PATH, variable `BLENDER`,
ou installation Windows standard). Le fichier `.blend` d'origine n'est jamais modifié.

Si `motocross.glb` est absent, la page d'accueil affiche un visuel de secours
élégant — aucune erreur, aucun blocage.
