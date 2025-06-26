function explorerApp() {
  return {
    // Data
    municipalities: [], // GeoJSON features
    neighborhoods: [], // GeoJSON features
    selectedMunicipality: null,
    searchTerm: "",

    // Chart settings
    chartXAxis: "population",
    chartYAxis: "wealth",

    // Table sorting
    sortField: "name",
    sortDirection: "asc",

    // Plot instances
    mapPlot: null,
    chartPlot: null,

    // Computed
    get sortedNeighborhoods() {
      return [...this.neighborhoods].sort((a, b) => {
        let aVal = a.properties[this.sortField];
        let bVal = b.properties[this.sortField];

        if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (this.sortDirection === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    },

    // Methods
    async init() {
      await this.loadMunicipalities();
      this.renderMap();
    },

    async loadMunicipalities() {
      // Mock GeoJSON data - replace with actual API call
      const mockMunicipalitiesGeoJSON = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              id: 1,
              name: "Springfield",
              population: 51500,
              wealth: 64.7,
              treecover: 23.6,
              density: 1850,
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-74.016, 40.7028],
                  [-73.996, 40.7028],
                  [-73.996, 40.7228],
                  [-74.016, 40.7228],
                  [-74.016, 40.7028],
                ],
              ],
            },
          },
          {
            type: "Feature",
            properties: {
              id: 2,
              name: "Riverside",
              population: 21600,
              wealth: 56.3,
              treecover: 16.3,
              density: 1583,
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-73.9951, 40.7489],
                  [-73.9751, 40.7489],
                  [-73.9751, 40.7689],
                  [-73.9951, 40.7689],
                  [-73.9951, 40.7489],
                ],
              ],
            },
          },
          {
            type: "Feature",
            properties: {
              id: 3,
              name: "Hilldale",
              population: 28000,
              wealth: 66.0,
              treecover: 33.2,
              density: 1430,
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-73.9812, 40.7731],
                  [-73.9612, 40.7731],
                  [-73.9612, 40.7931],
                  [-73.9812, 40.7931],
                  [-73.9812, 40.7731],
                ],
              ],
            },
          },
        ],
      };

      this.municipalities = mockMunicipalitiesGeoJSON.features;
    },

    renderMap() {
      const container = document.getElementById("map-container");
      container.innerHTML = "";

      const dataToShow = this.selectedMunicipality
        ? this.neighborhoods
        : this.municipalities;

      if (dataToShow.length === 0) return;

      // Create a proper GeoJSON FeatureCollection
      const geoData = {
        type: "FeatureCollection",
        features: dataToShow,
      };

      this.mapPlot = Plot.plot({
        width: container.clientWidth || 600,
        height: 400,
        x: {
          ticks: 0,
          label: null,
        },
        y: {
          ticks: 0,
          label: null,
        },
        marks: [
          // Polygon fills
          Plot.geo(geoData, {
            fill: "lightblue",
            stroke: "black",
            strokeWidth: 2,
            fillOpacity: 0.7,
          }),
        ],
      });

      container.appendChild(this.mapPlot);
    },

    handleSearchInput() {
      // Check if the entered text matches a municipality name
      const matchedMunicipality = this.municipalities.find(
        (m) => m.properties.name === this.searchTerm,
      );

      if (matchedMunicipality) {
        this.selectMunicipalityById(matchedMunicipality.properties.id);
      }
    },

    async selectMunicipalityById(municipalityId) {
      this.selectedMunicipality = this.municipalities.find(
        (m) => m.properties.id === municipalityId,
      );

      if (this.selectedMunicipality) {
        // Load neighborhood data
        await this.loadNeighborhoodData(municipalityId);

        // Re-render map with neighborhoods
        this.renderMap();

        // Update chart
        this.updateChart();
      }
    },

    async loadNeighborhoodData(municipalityId) {
      // Mock GeoJSON neighborhood data - replace with actual API call
      const mockNeighborhoodsGeoJSON = {
        1: {
          // Springfield
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                id: 1,
                name: "Downtown",
                population: 15000,
                wealth: 65.2,
                treecover: 12.5,
                density: 2500,
              },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [-74.01, 40.705],
                    [-74.002, 40.705],
                    [-74.002, 40.712],
                    [-74.01, 40.712],
                    [-74.01, 40.705],
                  ],
                ],
              },
            },
            {
              type: "Feature",
              properties: {
                id: 2,
                name: "North Hills",
                population: 8500,
                wealth: 78.9,
                treecover: 35.2,
                density: 1200,
              },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [-74.01, 40.712],
                    [-74.002, 40.712],
                    [-74.002, 40.719],
                    [-74.01, 40.719],
                    [-74.01, 40.712],
                  ],
                ],
              },
            },
            {
              type: "Feature",
              properties: {
                id: 3,
                name: "East Side",
                population: 12000,
                wealth: 45.6,
                treecover: 8.9,
                density: 3200,
              },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [-74.002, 40.705],
                    [-73.998, 40.705],
                    [-73.998, 40.719],
                    [-74.002, 40.719],
                    [-74.002, 40.705],
                  ],
                ],
              },
            },
          ],
        },
        2: {
          // Riverside
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                id: 6,
                name: "Riverside Center",
                population: 11000,
                wealth: 58.7,
                treecover: 15.3,
                density: 2100,
              },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [-73.99, 40.752],
                    [-73.98, 40.752],
                    [-73.98, 40.762],
                    [-73.99, 40.762],
                    [-73.99, 40.752],
                  ],
                ],
              },
            },
          ],
        },
        3: {
          // Hilldale
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                id: 9,
                name: "Old Town",
                population: 5600,
                wealth: 89.3,
                treecover: 45.8,
                density: 890,
              },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [-73.975, 40.776],
                    [-73.965, 40.776],
                    [-73.965, 40.786],
                    [-73.975, 40.786],
                    [-73.975, 40.776],
                  ],
                ],
              },
            },
          ],
        },
      };

      const neighborhoodData = mockNeighborhoodsGeoJSON[municipalityId];
      this.neighborhoods = neighborhoodData ? neighborhoodData.features : [];
    },

    updateChart() {
      if (!this.selectedMunicipality || this.neighborhoods.length === 0) return;

      const container = document.getElementById("chart-container");

      // Use requestAnimationFrame to ensure the container is properly laid out
      requestAnimationFrame(() => {
        const neighborhoodData = this.neighborhoods.map((n) => n.properties);

        const containerWidth = container.clientWidth || 400;

        this.chartPlot = Plot.plot({
          title: `${this.getAxisLabel(this.chartYAxis)} vs ${this.getAxisLabel(this.chartXAxis)}`,
          width: containerWidth,
          height: 400,
          grid: true,
          x: {
            label: this.getAxisLabel(this.chartXAxis),
            nice: true,
          },
          y: {
            label: this.getAxisLabel(this.chartYAxis),
            nice: true,
          },
          marks: [
            Plot.dot(neighborhoodData, {
              x: this.chartXAxis,
              y: this.chartYAxis,
              fill: "steelblue",
              stroke: "white",
              strokeWidth: 2,
              r: 6,
              title: (d) =>
                `${d.name}\n${this.getAxisLabel(this.chartXAxis)}: ${this.formatValue(d[this.chartXAxis], this.chartXAxis)}\n${this.getAxisLabel(this.chartYAxis)}: ${this.formatValue(d[this.chartYAxis], this.chartYAxis)}`,
            }),
            Plot.text(neighborhoodData, {
              x: this.chartXAxis,
              y: this.chartYAxis,
              text: "name",
              dy: -12,
              fontSize: 10,
              fill: "black",
            }),
          ],
        });

        container.innerHTML = "";
        container.appendChild(this.chartPlot);
      });
    },

    formatValue(value, axis) {
      switch (axis) {
        case "population":
          return value.toLocaleString();
        case "wealth":
          return value.toFixed(2);
        case "treecover":
          return value.toFixed(1) + "%";
        case "density":
          return value.toFixed(0);
        default:
          return value;
      }
    },

    getAxisLabel(axis) {
      const labels = {
        population: "Population",
        wealth: "Wealth Index",
        treecover: "Tree Cover %",
        density: "Population Density",
      };
      return labels[axis] || axis;
    },

    sortTable(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
      } else {
        this.sortField = field;
        this.sortDirection = "asc";
      }
    },

    goBackToMunicipalities() {
      this.selectedMunicipality = null;
      this.neighborhoods = [];
      this.searchTerm = "";
      this.renderMap();
    },
  };
}
