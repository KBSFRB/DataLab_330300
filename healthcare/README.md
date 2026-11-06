# Médecins généralistes en Belgique – carte par commune

Site statique (Alpine.js, D3, hyparquet et proj4 en modules ES, sans étape de build).

## Données

Le site lit le fichier GeoParquet ici :

    data/municipality_accessibility_3km.parquet

Le chargement et le décodage sont faits dans le navigateur avec hyparquet. Les géométries EPSG:3812 sont converties en coordonnées WGS84 pour D3 avec proj4. Le chemin est défini dans `js/config.js`.

## Lancer le site

Les modules ES et `fetch` ne fonctionnent pas depuis `file://` : il faut un serveur HTTP local.

    python3 -m http.server 8000

puis ouvrir <http://localhost:8000>.

## Organisation

| Fichier         | Rôle                                                              |
|-----------------|-------------------------------------------------------------------|
| `index.html`    | Structure de la page, import map (D3, Alpine), gabarits Alpine    |
| `css/style.css` | Styles                                                            |
| `js/main.js`    | Point d'entrée : enregistre le composant Alpine et le démarre     |
| `js/app.js`     | Composant Alpine : état, légende, popup                           |
| `js/config.js`  | Indicateurs (colonnes Parquet, couleurs, domaines), constantes    |
| `js/data.js`    | Chargement Parquet, géométries, regroupement et rang               |
| `js/scales.js`  | Échelles de couleurs et dégradé de la légende                     |
| `js/map.js`     | Carte D3 (projection, couleurs, zoom, contours)                   |
| `js/charts.js`  | Graphiques du popup (distribution + commune et moyenne belge)     |
| `js/format.js`  | Formatage des nombres en français                                 |

Pour ajouter un indicateur, il suffit d'ajouter une entrée dans `INDICATORS` (`js/config.js`).
