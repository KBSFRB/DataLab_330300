# Médecins généralistes en Belgique – carte par commune

Site statique (Alpine.js + D3, modules ES, sans étape de build).

## Données

Placer le fichier GeoJSON complet ici :

    data/GP_per_municipality_2021.geojson

(le chemin est défini dans `js/config.js`).

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
| `js/config.js`  | Indicateurs (propriété GeoJSON, couleurs, domaines), constantes   |
| `js/data.js`    | Chargement du GeoJSON, regroupement par province, rang            |
| `js/scales.js`  | Échelles de couleurs et dégradé de la légende                     |
| `js/map.js`     | Carte D3 (projection, couleurs, zoom, contours)                   |
| `js/charts.js`  | Graphiques du popup (bande de densité + 3 repères)                     |
| `js/format.js`  | Formatage des nombres en français                                 |

Pour ajouter un indicateur, il suffit d'ajouter une entrée dans `INDICATORS` (`js/config.js`).
