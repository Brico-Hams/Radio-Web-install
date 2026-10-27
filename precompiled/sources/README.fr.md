# Sources locales du firmware

[Español](README.md) · [English (US)](README.en.md) · [Français](README.fr.md) · [Deutsch](README.de.md)

Ces paquets conservent les sources, licences et avis de leurs projets d'origine. Il ne s'agit ni de firmware d'usine ni de sauvegardes mémoire d'une radio.

| Fichier | Origine | Commit |
| --- | --- | --- |
| `f4hwn-fusion-v6.1.0-source.zip` | https://github.com/armel/uv-k1-k5v3-firmware-custom | `f556a96e73c3e423a00cf473aeb37f827cac05a5` |
| `ardf-v05-source.zip` | https://github.com/reald/uv-k1-k5v3-firmware-custom | `e2bb5b011f39b8c2777a21206086dd556b0e9e2d` |

Les ZIP exportent les commits indiqués, sans métadonnées Git ni répertoires de compilation. Pour reproduire l'état local de Fusion, extrayez son ZIP et appliquez `fusion-local-settings.patch` depuis la racine :

```sh
git apply fusion-local-settings.patch
```

Le correctif conserve les réglages ARDF locaux de navigation, pas et mode AM ; il n'est pas appliqué automatiquement lors de l'installation d'une image. Les modules Bricohams et les outils de compilation se trouvent dans `firmware/bricohams` et `scripts` du dépôt principal. Le catalogue des images distribuables est `precompiled/catalog.json`, avec empreintes et provenance par image.

`SHA256SUMS` permet de vérifier les paquets et le correctif. Les licences et attributions originales restent applicables. Les dossiers de clones locaux sont exclus de Git pour éviter les références à des dépôts imbriqués qui ne seraient pas récupérés en clonant ce projet.
