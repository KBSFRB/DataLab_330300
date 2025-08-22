function makeCircleAndLegend(map, radius) {
  let marker = {};

  marker.circle = L.circle([0, 0], { radius: radius, weight: 2 })
    .addTo(map)
    .bringToBack();
  marker.legendText = L.divIcon({
    className: "legend-text",
    html: "",
  });
  marker.legendMarker = L.marker([0, 0], {
    icon: marker.legendText,
  }).addTo(map);

  marker.setLatLng = function (LatLng) {
    this.circle.setLatLng(LatLng);
    let bottomEdge = L.latLng(
      LatLng.lat - radius / 111319 - 0.0001, // approximate conversion from meters to degrees
      LatLng.lng,
    );
    this.legendMarker.setLatLng(bottomEdge);
  };

  marker.setColor = function (color) {
    this.circle.setStyle({
      color: color,
      fillColor: color,
      dashArray: null,
    });
  };

  marker.setText = function (text) {
    this.legendText.options.html = `<div class="w-[250px] -ml-[125px] text-center text-sm"><span class="bg-white/75 px-2 py-1">${text}</span></div>`;
    this.legendMarker.setIcon(this.legendText);
  };

  marker.getBounds = function () {
    return this.circle.getBounds();
  };

  marker.hide = function () {
    this.circle.setLatLng([0, 0]);
    this.legendMarker.setLatLng([0, 0]);
  };

  return marker;
}

// Function to create mobile popup text with building scores
function buildingPopupText(feature) {
  const buildingId = feature.properties.id;
  const corrections =
    window.buildingCorrections && window.buildingCorrections[buildingId];

  // Helper to format original/corrected value text
  const formatValue = (originalValue, correctedValue, lang) => {
    const yesText = { fr: "oui", en: "yes", nl: "ja" }[lang];
    const noText = { fr: "non", en: "no", nl: "nee" }[lang];

    // If there's a correction that differs from original
    if (correctedValue !== -1 && correctedValue !== originalValue) {
      const yesNo = correctedValue ? yesText : noText;
      const modelLabel = {
        fr: `<em>Cette valeur a été corrigée par un utilisateur</em>`,
        en: `<em>This value was corrected by a user</em>`,
        nl: `<em>Deze waarde is door een gebruiker gecorrigeerd</em>`,
      }[lang];
      return `${yesNo} ${modelLabel}`;
    }

    // No correction - just show original score
    const originalText = originalValue ? yesText : noText;
    return originalText;
  };

  const rule3Score = rule3(feature);
  const rule30Score = rule30(feature);
  const rule300Score = rule300(feature);

  const r3Correction = corrections ? corrections.r3 : -1;
  const r30Correction = corrections ? corrections.r30 : -1;
  const r300Correction = corrections ? corrections.r300 : -1;

  return i18n.div({
    fr: `<strong>Scores du bâtiment</strong><br><br>
             <strong>🌳 Au moins 3 arbres visibles :</strong><br>
             <span style="margin-left: 10px;">${formatValue(rule3Score, r3Correction, "fr")}</span><br><br>
             <strong>🌿 Plus de 30% de couverture arborée :</strong><br>
             <span style="margin-left: 10px; font-size: 12px; color: #666;">(dans un rayon de 500m)</span><br>
             <span style="margin-left: 10px;">${formatValue(rule30Score, r30Correction, "fr")}</span><br><br>
             <strong>🏞️ À moins de 300m d'un parc public :</strong><br>
             <span style="margin-left: 10px;">${formatValue(rule300Score, r300Correction, "fr")}</span>
             `,
    en: `<strong>Building Scores</strong><br><br>
             <strong>🌳 At least 3 trees visible:</strong><br>
             <span style="margin-left: 10px;">${formatValue(rule3Score, r3Correction, "en")}</span><br><br>
             <strong>🌿 Over 30% tree canopy cover:</strong><br>
             <span style="margin-left: 10px; font-size: 12px; color: #666;">(in a 500m radius)</span><br>
             <span style="margin-left: 10px;">${formatValue(rule30Score, r30Correction, "en")}</span><br><br>
             <strong>🏞️ Less than 300m from a public park:</strong><br>
             <span style="margin-left: 10px;">${formatValue(rule300Score, r300Correction, "en")}</span>
             `,
    nl: `<strong>Gebouw Scores</strong><br><br>
             <strong>🌳 Minstens 3 bomen zichtbaar:</strong><br>
             <span style="margin-left: 10px;">${formatValue(rule3Score, r3Correction, "nl")}</span><br><br>
             <strong>🌿 Meer dan 30% boomkruinbedekking:</strong><br>
             <span style="margin-left: 10px; font-size: 12px; color: #666;">(in een straal van 500m)</span><br>
             <span style="margin-left: 10px;">${formatValue(rule30Score, r30Correction, "nl")}</span><br><br>
             <strong>🏞️ Op minder dan 300m van een publiek toegankelijk park:</strong><br>
             <span style="margin-left: 10px;">${formatValue(rule300Score, r300Correction, "nl")}</span>
             `,
  });
}

const threeCirclesInteraction = (function () {
  let l3, l30, l300;

  function init(map) {
    l3 = makeCircleAndLegend(map, 60);
    l300 = makeCircleAndLegend(map, 300);
    l30 = makeCircleAndLegend(map, 500);
  }

  function show(map, layer) {
    const buildingId = layer.feature.properties.id;
    const corrections =
      window.buildingCorrections && window.buildingCorrections[buildingId];

    let center = layer.getCenter();

    l300.setLatLng(center);
    l30.setLatLng(center);
    l3.setLatLng(center);

    // Helper function to apply style based on correction
    const applyCircleStyle = (circleLayer, originalScore, correction) => {
      const score = correction !== -1 ? correction : originalScore;
      const color = get_color(colors_scheme, score);
      circleLayer.setColor(color);
    };

    // Apply styles to circles based on rules and corrections
    applyCircleStyle(
      l3,
      rule3(layer.feature),
      corrections ? corrections.r3 : -1,
    );
    applyCircleStyle(
      l30,
      rule30(layer.feature),
      corrections ? corrections.r30 : -1,
    );
    applyCircleStyle(
      l300,
      rule300(layer.feature),
      corrections ? corrections.r300 : -1,
    );

    // Helper to format original/corrected value text
    const formatValue = (originalValue, correctedValue, lang) => {
      const yesText = { fr: "oui", en: "yes", nl: "ja" }[lang];
      const noText = { fr: "non", en: "no", nl: "nee" }[lang];

      // If there's a correction that differs from original
      if (correctedValue !== -1 && correctedValue !== originalValue) {
        const yesNo = correctedValue ? yesText : noText;
        const modelLabel = {
          fr: `<br><em>Cette valeur a été corrigée par un utilisateur</em>`,
          en: `<br><em>This value was corrected by a user</em>`,
          nl: `<br><em>Deze waarde is door een gebruiker gecorrigeerd</em>`,
        }[lang];

        return `${yesNo}${modelLabel}`;
      }

      // No correction - just show original score without explanation
      const originalText = originalValue ? yesText : noText;
      return originalText;
    };

    let legend3 = i18n.span({
      fr: `Au moins 3 arbres visibles : ${formatValue(rule3(layer.feature), corrections ? corrections.r3 : -1, "fr")}`,
      en: `At least 3 trees visible: ${formatValue(rule3(layer.feature), corrections ? corrections.r3 : -1, "en")}`,
      nl: `Minstens 3 bomen zichtbaar: ${formatValue(rule3(layer.feature), corrections ? corrections.r3 : -1, "nl")}`,
    });

    l3.setText(legend3);

    let legend30 = i18n.span({
      fr: `Plus de 30% de couverture arborée : ${formatValue(rule30(layer.feature), corrections ? corrections.r30 : -1, "fr")}<br>(dans un rayon de 500m)`,
      en: `Over 30% tree canopy cover: ${formatValue(rule30(layer.feature), corrections ? corrections.r30 : -1, "en")}<br>(in a 500m radius)`,
      nl: `Meer dan 30% boomkruinbedekking: ${formatValue(rule30(layer.feature), corrections ? corrections.r30 : -1, "nl")}<br>(in een straal van 500m)`,
    });

    l30.setText(legend30);

    let legend300 = i18n.span({
      fr: `À moins de 300m d'un parc public : ${formatValue(rule300(layer.feature), corrections ? corrections.r300 : -1, "fr")}`,
      en: `Less than 300m from a public park: ${formatValue(rule300(layer.feature), corrections ? corrections.r300 : -1, "en")}`,
      nl: `Op minder dan 300m van een publiek toegankelijk park: ${formatValue(rule300(layer.feature), corrections ? corrections.r300 : -1, "nl")}`,
    });

    l300.setText(legend300);

    // Get the current bounds of the layer
    const bounds = l30.getBounds();

    // Modify the bounds by shifting the south-west and north-east latitude
    const newBounds = L.latLngBounds(
      L.latLng(bounds.getSouthWest().lat - 0.0012, bounds.getSouthWest().lng), // Shift south-west latitude down
      L.latLng(bounds.getNorthEast().lat - 0.0012, bounds.getNorthEast().lng), // Shift north-east latitude down
    );

    map.fitBounds(newBounds, { padding: [20, 20] });
  }

  function hide(map) {
    l300.hide();
    l30.hide();
    l3.hide();
  }

  return { init, show, hide };
})();

const buildingHighlightInteraction = (function () {
  let highlightLayer = null;

  function init(map) {
    // No initialization needed for highlight
  }

  function show(map, layer) {
    // Remove previous highlight if it exists
    if (highlightLayer) {
      map.removeLayer(highlightLayer);
    }

    // Create a new highlight layer with the same geometry but different style
    highlightLayer = L.geoJSON(layer.feature, {
      style: {
        color: "#ff0000",
        weight: 4,
        opacity: 1,
        fillOpacity: 0,
        dashArray: null,
      },
    }).addTo(map);
  }

  function hide() {
    if (highlightLayer) {
      map.removeLayer(highlightLayer);
      highlightLayer = null;
    }
  }

  return { init, show, hide };
})();

const buildingPopupInteraction = (function () {
  let popup = null;

  function init(map) {
    // No initialization needed for popup
  }

  function show(map, layer) {
    // Remove previous popup if it exists
    if (popup) {
      map.closePopup(popup);
    }

    const popupContent = buildingPopupText(layer.feature);
    const center = layer.getCenter();

    popup = L.popup({
      maxWidth: 300,
      closeButton: true,
      autoClose: false,
      closeOnClick: false,
    })
      .setLatLng(center)
      .setContent(popupContent)
      .openOn(map);
  }

  function hide() {
    if (popup) {
      map.closePopup(popup);
      popup = null;
    }
  }

  return { init, show, hide };
})();

function prepareBuildingInteraction(map, effects) {
  let current_center = null;

  for (let effect of effects) {
    effect.init(map);
  }

  // hide highlight when building is no longer visible
  map.on("moveend", function () {
    let bounds = map.getBounds();
    let zoom = map.getZoom();

    if (
      current_center !== null &&
      (zoom < min_building_zoom || !bounds.contains(current_center))
    ) {
      unfocus();
    }
  });
  map.on("zoomend", function () {
    if (map.getZoom() < min_building_zoom) {
      unfocus();
    }
  });

  function unfocus() {
    for (let effect of effects) {
      effect.hide();
    }
    current_center = null;
  }

  function focus(e) {
    buildingClicked = true; // Needed to distinguish between clicks that open a building and clicks that don't
    var layer = e.target;
    current_center = layer.getCenter();
    map.panTo(current_center);
    for (let effect of effects) {
      effect.show(map, layer);
    }
  }

  focus.unfocus = unfocus;
  return focus;
}

function make_area_popup_text(level) {
  return function (f) {
    const areaName = i18n.span({
      fr: f.properties[`T_${level}_FR`] || "Secteur sans nom",
      nl: f.properties[`T_${level}_NL`] || "Sector zonder naam",
      en: f.properties[`T_${level}_NL`] || "Sector without name",
    });
    const rule3Score = rule3(f);
    const rule30Score = rule30(f);
    const rule300Score = rule300(f);
    const averageScore = rule3Score + rule30Score + rule300Score;

    // make link to explorer page
    let explorer_url_param = "";
    if (level === "PROVI") {
      explorer_url_param = `mun_in_${f.properties.prov_nis}`;
    } else if (level === "MUN" || level === "SEC") {
      explorer_url_param = `sector_in_${f.properties.mun_nis}`;
    }

    return i18n.div({
      fr: `<strong>${areaName}</strong><br><br>
          <strong>🌳 Au moins 3 arbres visibles :</strong><br>
          <span style="margin-left: 10px;">${format_percent(rule3Score)} des bâtiments</span><br><br>
          <strong>🌿 Plus de 30% de couverture arborée :</strong><br>
          <span style="margin-left: 10px; font-size: 12px; color: #666;">(dans un rayon de 500m)</span><br>
          <span style="margin-left: 10px;">${format_percent(rule30Score)} des bâtiments</span><br><br>
          <strong>🏞️ À moins de 300m d'un parc public :</strong><br>
          <span style="margin-left: 10px;">${format_percent(rule300Score)} des bâtiments</span><br><br>
          <strong>Score moyen :</strong><br>
          <span style="margin-left: 10px;">${format_score(averageScore)} / 3</span><br><br>
          <hr><br>
          <a href="explorer.html?v=${explorer_url_param}&lang=fr" target="_blank">
            Ouvrir dans l'outil d'exploration
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="inline-icon" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"/>
              <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"/>
            </svg>
          </a>
          `,
      en: `<strong>${areaName}</strong><br><br>
          <strong>🌳 At least 3 trees visible:</strong><br>
          <span style="margin-left: 10px;">${format_percent(rule3Score)} of buildings</span><br><br>
          <strong>🌿 Over 30% tree canopy cover:</strong><br>
          <span style="margin-left: 10px; font-size: 12px; color: #666;">(in a 500m radius)</span><br>
          <span style="margin-left: 10px;">${format_percent(rule30Score)} of buildings</span><br><br>
          <strong>🏞️ Less than 300m from public park:</strong><br>
          <span style="margin-left: 10px;">${format_percent(rule300Score)} of buildings</span><br><br>
          <strong>Average score:</strong><br>
          <span style="margin-left: 10px;">${format_score(averageScore)} / 3</span><br><br>
          <hr><br>
          <a href="explorer.html?v=${explorer_url_param}&lang=en" target="_blank">
          Open in the explorer tool
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="inline-icon" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"/>
              <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"/>
            </svg>
          </a>
          `,
      nl: `<strong>${areaName}</strong><br><br>
          <strong>🌳 Minstens 3 bomen zichtbaar:</strong><br>
          <span style="margin-left: 10px;">${format_percent(rule3Score)} van de gebouwen</span><br><br>
          <strong>🌿 Meer dan 30% boomkruinbedekking:</strong><br>
          <span style="margin-left: 10px; font-size: 12px; color: #666;">(in een straal van 500m)</span><br>
          <span style="margin-left: 10px;">${format_percent(rule30Score)} van de gebouwen</span><br><br>
          <strong>🏞️ Op minder dan 300m van een publiek toegankelijk park:</strong><br>
          <span style="margin-left: 10px;">${format_percent(rule300Score)} van de gebouwen</span><br><br>
          <strong>Gemiddelde score:</strong><br>
          <span style="margin-left: 10px;">${format_score(averageScore)} / 3</span><br><br>
          <hr><br>
          <a href="explorer.html?v=${explorer_url_param}&lang=nl" target="_blank">
          Openen in de verkenner-tool
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="inline-icon" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"/>
              <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"/>
            </svg>
          </a>
          `,
    });
  };
}
