function explorerApp() {
  return {
    // Data
    features: [], // Current level features (GeoJSON features)
    metadata: null, // Current level metadata
    searchList: [], // Full search list from API

    // Navigation state
    currentLevel: null, // 'prov', 'mun', 'sector'
    parentId: null, // NIS code of parent

    // UI state
    searchTerm: "",
    isLoading: false,
    error: null,
    searchResults: [], // Filtered search results for datalist

    // Chart settings
    chartXAxis: null, // Will be set from available_indicators
    chartYAxis: null, // Will be set from other_indicators

    // Table sorting
    sortField: "name",
    sortDirection: "asc",

    // Plot instances
    mapPlot: null,
    chartPlot: null,

    colors_scheme: [
      "#8c510a",
      "#d8b365",
      "#f6e8c3",
      "#c7eae5",
      "#5ab4ac",
      "#01665e",
    ],

    // Computed
    get sortedFeatures() {
      return [...this.features].sort((a, b) => {
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

    get showChart() {
      return this.metadata?.show_child_indicators && this.features.length > 0;
    },

    get showTable() {
      return this.metadata?.show_child_indicators && this.features.length > 0;
    },

    get currentLevelName() {
      if (!this.metadata) return "";

      const levelNames = {
        prov: "Provinces",
        mun: "Municipalities",
        sector: "Statistical Sectors",
      };

      return levelNames[this.metadata.child_level] || this.metadata.child_level;
    },

    get parentName() {
      if (!this.metadata?.parent_name) return "";

      // Use English name if available, fallback to other languages
      return (
        this.metadata.parent_name.en ||
        this.metadata.parent_name.fr ||
        this.metadata.parent_name.nl ||
        ""
      );
    },

    get breadcrumbs() {
      if (!this.metadata?.breadcrumbs) return [];

      const crumbs = this.metadata.breadcrumbs.map((crumb) => ({
        nis: crumb.nis,
        child_level: crumb.child_level,
        name: crumb.name.en || crumb.name.fr || crumb.name.nl || crumb.nis,
        viewName: `${crumb.child_level}_in_${crumb.nis}`,
        isClickable: true,
      }));

      // Add current parent name as final breadcrumb (non-clickable)
      if (this.parentName) {
        crumbs.push({
          nis: this.parentId,
          child_level: this.currentLevel,
          name: this.parentName,
          viewName: null,
          isClickable: false,
        });
      }

      return crumbs;
    },

    // Methods
    async init() {
      const url = new URL(window.location.href);
      const viewName = url.searchParams.get("v") || "prov_in_BE";

      // Load search list and show view in parallel
      await Promise.all([this.loadSearchList(), this.showView(viewName)]);
    },

    async loadSearchList() {
      try {
        const response = await fetch(
          "https://pub-89fa60aa9ca34badb10c8e2401454ce8.r2.dev/explorer/search_list.json",
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch search list: ${response.status}`);
        }
        this.searchList = await response.json();
        this.searchResults = this.searchList.slice(0, 50); // Show first 50 results initially
      } catch (err) {
        console.error("Error loading search list:", err);
        // Don't show error to user as search is optional functionality
      }
    },

    async loadData(viewName) {
      const baseUrl =
        "https://pub-89fa60aa9ca34badb10c8e2401454ce8.r2.dev/explorer";

      try {
        // Load metadata and GeoJSON in parallel
        const [metadataResponse, geojsonResponse] = await Promise.all([
          fetch(`${baseUrl}/${viewName}.json`),
          fetch(`${baseUrl}/${viewName}.geojson`),
        ]);

        if (!metadataResponse.ok) {
          throw new Error(
            `Failed to fetch metadata: ${metadataResponse.status}`,
          );
        }

        if (!geojsonResponse.ok) {
          throw new Error(`Failed to fetch GeoJSON: ${geojsonResponse.status}`);
        }

        const metadata = await metadataResponse.json();
        const geojson = await geojsonResponse.json();

        this.metadata = metadata;
        this.features = geojson.features || [];
        this.currentLevel = metadata.child_level;
        this.parentId = metadata.parent_id;
      } catch (err) {
        throw new Error(`Error loading data for ${viewName}: ${err.message}`);
      }
    },

    setupDefaultChartAxes() {
      if (!this.metadata) return;

      // Set default X axis from available_indicators
      if (this.metadata.available_indicators?.length > 0) {
        this.chartXAxis = this.metadata.available_indicators[0].id;
      }

      // Set default Y axis from other_indicators
      if (this.metadata.other_indicators?.length > 0) {
        this.chartYAxis = this.metadata.other_indicators[0].id;
      }
    },

    renderMap() {
      const container = document.getElementById("map-container");
      container.innerHTML = "";

      if (this.features.length === 0) return;

      // Create a proper GeoJSON FeatureCollection
      const geoData = {
        type: "FeatureCollection",
        features: this.features,
      };

      // Get the color fill function
      const fillColor = this.getMapFillColor();

      const marks = [
        // Polygon fills
        Plot.geo(geoData, {
          fill: fillColor,
          stroke: "black",
          strokeWidth: 2,
          fillOpacity: 0.7,
        }),
      ];

      // Add click interaction if zoomable
      if (this.metadata?.zoomable) {
        marks.push(
          Plot.geo(geoData, {
            fill: "transparent",
            stroke: "transparent",
            cursor: "pointer",
            title: (d) => d.properties.name_en,
            href: (d) =>
              this.metadata?.zoomable
                ? `?v=${this.metadata.next_level}_in_${d.properties.nis}`
                : null,
          }),
        );
      }

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
        marks: marks,
      });

      container.appendChild(this.mapPlot);
    },

    async showView(viewName) {
      this.isLoading = true;
      this.error = null;

      try {
        // Load next level data
        await this.loadData(viewName);

        this.renderMap();
        this.setupDefaultChartAxes();
        this.updateChart();
      } catch (err) {
        this.error = `Failed to load detailed view: ${err.message}`;
        console.error("Error selecting feature:", err);
      } finally {
        this.isLoading = false;
      }
    },

    updateChart() {
      if (!this.showChart || !this.chartXAxis || !this.chartYAxis) return;

      const container = document.getElementById("chart-container");

      // Use requestAnimationFrame to ensure the container is properly laid out
      requestAnimationFrame(() => {
        const featureData = this.features.map((f) => f.properties);

        const containerWidth = container.clientWidth || 400;

        const fillColor = this.getScatterFillColor();

        this.chartPlot = Plot.plot({
          title: `${this.getIndicatorLabel(this.chartYAxis)} vs ${this.getIndicatorLabel(this.chartXAxis)}`,
          width: containerWidth,
          height: 400,
          grid: true,
          x: {
            label: this.getIndicatorLabel(this.chartXAxis),
            nice: true,
          },
          y: {
            label: this.getIndicatorLabel(this.chartYAxis),
            nice: true,
          },
          marks: [
            Plot.dot(featureData, {
              x: this.chartXAxis,
              y: this.chartYAxis,
              fill: fillColor,
              stroke: "white",
              strokeWidth: 2,
              r: 6,
              title: (d) =>
                `${d.name || d.nis}\n${this.getIndicatorLabel(this.chartXAxis)}: ${this.formatValue(d[this.chartXAxis], this.chartXAxis)}\n${this.getIndicatorLabel(this.chartYAxis)}: ${this.formatValue(d[this.chartYAxis], this.chartYAxis)}`,
            }),
            Plot.text(featureData, {
              x: this.chartXAxis,
              y: this.chartYAxis,
              text: (d) => d.name || d.nis,
              dy: -12,
              fontSize: 10,
              fill: "black",
            }),
          ],
        });

        container.innerHTML = "";
        container.appendChild(this.chartPlot);
      });

      // Update map colors when chart axes change
      this.renderMap();
    },

    getIndicatorLabel(indicatorId) {
      if (!this.metadata) return indicatorId;

      // Look in available_indicators first
      const availableIndicator = this.metadata.available_indicators?.find(
        (ind) => ind.id === indicatorId,
      );
      if (availableIndicator) return availableIndicator.name;

      // Then look in other_indicators
      const otherIndicator = this.metadata.other_indicators?.find(
        (ind) => ind.id === indicatorId,
      );
      if (otherIndicator) return otherIndicator.name;

      return indicatorId;
    },

    formatValue(value, indicatorId) {
      if (value == null) return "N/A";

      // Special formatting based on indicator type
      if (indicatorId.includes("perc") || indicatorId.includes("%")) {
        return (value * 100).toFixed(1) + "%";
      }

      if (indicatorId === "pop" || indicatorId === "buildings") {
        return value.toLocaleString();
      }

      if (indicatorId === "Shape_Area") {
        return value.toFixed(2) + " km²";
      }

      if (typeof value === "number") {
        return value.toFixed(2);
      }

      return value;
    },

    sortTable(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
      } else {
        this.sortField = field;
        this.sortDirection = "asc";
      }
    },

    handleSearchInput() {
      if (!this.searchTerm.trim()) {
        this.searchResults = this.searchList.slice(0, 50);
        return;
      }

      // Check if the input matches an exact item from the search list
      const selectedItem = this.searchList.find(
        (item) => this.getSearchDisplayName(item) === this.searchTerm,
      );

      if (selectedItem) {
        // Navigate immediately if exact match found
        window.location.href = `?v=${this.getViewName(selectedItem)}`;
        return;
      }

      const term = this.searchTerm.toLowerCase();
      this.searchResults = this.searchList
        .filter(
          (item) =>
            (item.name_fr && item.name_fr.toLowerCase().includes(term)) ||
            (item.name_nl && item.name_nl.toLowerCase().includes(term)) ||
            (item.nis && item.nis.includes(term)),
        )
        .slice(0, 50); // Limit to 50 results for performance
    },

    getViewName(item) {
      return `${item.level}_in_${item.nis}`;
    },

    getSearchDisplayName(item) {
      let name = item.name_nl;
      if (item.name_fr != item.name_nl) {
        name += " - " + item.name_fr;
      }
      return name;
    },

    // Utility method to get all available indicators for select options
    get availableXAxisOptions() {
      return this.metadata?.available_indicators || [];
    },

    get availableYAxisOptions() {
      return this.metadata?.other_indicators || [];
    },

    // Get table columns based on metadata
    get tableColumns() {
      if (!this.metadata) return [];

      const columns = [{ id: "name", name: "Name", sortable: true }];

      // Add available indicators
      if (this.metadata.available_indicators) {
        columns.push(
          ...this.metadata.available_indicators.map((ind) => ({
            id: ind.id,
            name: ind.name,
            sortable: true,
          })),
        );
      }

      // Add other indicators
      if (this.metadata.other_indicators) {
        columns.push(
          ...this.metadata.other_indicators.map((ind) => ({
            id: ind.id,
            name: ind.name,
            sortable: true,
          })),
        );
      }

      return columns;
    },

    getMapFillColor() {
      // If no x-axis selected or no features, use default color
      if (!this.chartXAxis || this.features.length === 0) {
        return "lightblue";
      }

      // Return function that maps feature to color
      return (d) => {
        const value = d.properties[this.chartXAxis];
        if (value == null || isNaN(value)) {
          return "#cccccc"; // Gray for missing values
        }
        return get_color(this.colors_scheme, value);
      };
    },

    getScatterFillColor() {
      // If no x-axis selected or no features, use default color
      if (!this.chartXAxis || this.features.length === 0) {
        return "lightblue";
      }

      // Return function that maps feature to color
      return (d) => {
        const value = d[this.chartXAxis];
        if (value == null || isNaN(value)) {
          return "#cccccc"; // Gray for missing values
        }
        return get_color(this.colors_scheme, value);
      };
    },

    // Check if a column is an x-axis option (available indicator)
    isXAxisColumn(columnId) {
      return (
        this.metadata?.available_indicators?.some(
          (ind) => ind.id === columnId,
        ) || false
      );
    },

    // Get background color for table cell
    getTableCellBackgroundColor(feature, columnId) {
      if (!this.isXAxisColumn(columnId)) {
        return "transparent";
      }

      const value = feature.properties[columnId];
      if (value == null || isNaN(value)) {
        return "#cccccc"; // Gray for missing values
      }
      return get_color(this.colors_scheme, value);
    },

    // Get text color for table cell based on background
    getTableCellTextColor(feature, columnId) {
      if (!this.isXAxisColumn(columnId)) {
        return "inherit";
      }

      const backgroundColor = this.getTableCellBackgroundColor(
        feature,
        columnId,
      );
      return color_is_light(backgroundColor) ? "black" : "white";
    },
  };
}
