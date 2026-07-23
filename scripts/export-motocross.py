"""
Export de la moto 3D Blender vers GLB optimisé pour le Web.

Ne modifie JAMAIS le fichier .blend d'origine : ce script travaille en mémoire
sur la scène ouverte par Blender en mode background, puis exporte un GLB.

Lancement (Blender doit être installé et accessible dans le terminal) :

    blender -b "Image/moto3d.blend" -P scripts/export-motocross.py

Sortie : public/models/motocross.glb

Le script :
  * supprime les caméras et lumières Blender (inutiles au Web) ;
  * ignore les objets masqués / techniques ;
  * applique les transformations (rotation/échelle) ;
  * conserve les matériaux, textures et noms d'objets utiles à l'animation ;
  * conserve les animations existantes si présentes ;
  * exporte en glTF binaire (.glb).
"""

import os
import bpy

OUTPUT = os.path.join("public", "models", "motocross.glb")


def log(msg: str) -> None:
    print(f"[export-motocross] {msg}")


def purge_cameras_and_lights() -> None:
    to_remove = [o for o in bpy.data.objects if o.type in {"CAMERA", "LIGHT"}]
    for obj in to_remove:
        log(f"suppression {obj.type} : {obj.name}")
        bpy.data.objects.remove(obj, do_unlink=True)


def purge_hidden() -> None:
    # Objets masqués dans le rendu ou la vue : considérés comme techniques
    for obj in list(bpy.data.objects):
        if obj.hide_render or obj.hide_viewport:
            log(f"suppression objet masqué : {obj.name}")
            bpy.data.objects.remove(obj, do_unlink=True)


def apply_transforms() -> None:
    bpy.ops.object.select_all(action="DESELECT")
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    if not meshes:
        return
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    try:
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    except RuntimeError as exc:  # transformations impossibles (instances liées…)
        log(f"transform_apply ignoré : {exc}")
    bpy.ops.object.select_all(action="DESELECT")


def main() -> None:
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    log(f"objets dans la scène : {len(bpy.data.objects)}")
    purge_cameras_and_lights()
    purge_hidden()
    apply_transforms()

    kept = [o.name for o in bpy.data.objects if o.type == "MESH"]
    log(f"objets exportés ({len(kept)}) : {', '.join(kept) if kept else 'aucun'}")

    bpy.ops.export_scene.gltf(
        filepath=OUTPUT,
        export_format="GLB",
        export_apply=True,          # applique les modificateurs
        export_materials="EXPORT",  # conserve les matériaux
        export_texcoords=True,
        export_normals=True,
        export_animations=True,     # conserve les animations si présentes
        export_cameras=False,
        export_lights=False,
        export_yup=True,            # Y-up : convention attendue par three.js
        use_visible=True,
    )
    size_mb = os.path.getsize(OUTPUT) / (1024 * 1024)
    log(f"écrit : {OUTPUT} ({size_mb:.2f} Mo)")


if __name__ == "__main__":
    main()
