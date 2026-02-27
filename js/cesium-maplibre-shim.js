(function () {
  if (!window.Cesium) return;

  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiMDc5ZTI2ZS0wYWQyLTRiYTMtYjM5MC1kZDk4ZWU3YTZhODQiLCJpZCI6Mzg4ODMzLCJpYXQiOjE3NzA2NTE1NjN9.wBVcqwSt_yH6iu2A6oGgxvWWhFErU24pxS6uoHdU4Xk';

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function zoomToHeight(zoom, lat) {
    const metersPerPixel = 156543.03392 * Math.cos((lat || 52) * Math.PI / 180) / Math.pow(2, zoom);
    return metersPerPixel * (window.innerHeight || 900);
  }

  function heightToZoom(height, lat) {
    const mpp = (height || 1000) / (window.innerHeight || 900);
    const z = Math.log2(156543.03392 * Math.cos((lat || 52) * Math.PI / 180) / Math.max(mpp, 0.000001));
    return clamp(z, 2, 22);
  }

  function evalExpr(expr, props) {
    if (Array.isArray(expr)) {
      const op = expr[0];
      if (op === 'get') return props ? props[expr[1]] : undefined;
      if (op === 'coalesce') {
        for (let i = 1; i < expr.length; i++) {
          const v = evalExpr(expr[i], props);
          if (v !== undefined && v !== null) return v;
        }
        return undefined;
      }
      if (op === 'concat') return expr.slice(1).map(e => String(evalExpr(e, props) ?? '')).join('');
      return undefined;
    }
    return expr;
  }

  function colorFrom(v, fallback) {
    const c = Cesium.Color.fromCssColorString(v || fallback || '#7C3AED');
    return c || Cesium.Color.fromCssColorString(fallback || '#7C3AED');
  }

  function ringToCartesian(ring, z) {
    return (ring || []).map(c => Cesium.Cartesian3.fromDegrees(c[0], c[1], z || 0));
  }

  function geomToRings(geom) {
    if (!geom) return [];
    if (geom.type === 'Polygon') return [geom.coordinates[0]];
    if (geom.type === 'MultiPolygon') return geom.coordinates.map(p => p[0]);
    return [];
  }

  class SourceRef {
    constructor(owner, id) { this.owner = owner; this.id = id; }
    setData(data) {
      this.owner._sources[this.id] = data || { type: 'FeatureCollection', features: [] };
      this.owner._rerenderBySource(this.id);
    }
  }

  class CesiumLibreMap {
    constructor(opts) {
      const center = opts?.center || [5.3, 52.2];
      const zoom = opts?.zoom ?? 8;
      this._center = { lng: center[0], lat: center[1] };
      this._zoom = zoom;
      this._sources = {};
      this._layers = {};
      this._events = {};
      this._bagHiddenFeatureKeys = new Set();
      this._bagSelectedFeature = null;
      this._bagSelectedFeatureKey = null;
      this._bagKeyProps = ['identificatie', 'id', 'objectid', 'fid', 'gml_id'];
      this._bagDebugEl = null;
      this._onKeyDown = (e) => this._handleGlobalKeyDown(e);
      document.addEventListener('keydown', this._onKeyDown);
      this._loadBagHiddenFromState();

      this.viewer = new Cesium.Viewer(opts.container, {
        animation: false,
        timeline: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        sceneMode: Cesium.SceneMode.SCENE3D,
      });

      this.viewer.imageryLayers.removeAll();
      this.viewer.imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/'
      }));
      this.viewer.scene.skyBox.show = false;
      this.viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#87CEEB');

      Cesium.Cesium3DTileset.fromUrl(
        'https://data.3dbag.nl/v20250903/cesium3dtiles/lod22/tileset.json',
        { maximumScreenSpaceError: 8 }
      ).then(
        (tileset) => {
          // 3D BAG heights are in WGS84 ellipsoid metres, which includes the
          // geoid-ellipsoid offset (~43 m in the Netherlands). With no terrain
          // (flat ellipsoid as ground), we need to shift the entire tileset down
          // by that offset so buildings sit on the OSM ground plane.
          // Use a surface reference point at the NL centre to get the correct
          // ECEF "down" vector — the bounding-sphere centroid cannot be used
          // because its ECEF chord centre is slightly below the ellipsoid for
          // country-wide datasets.
          const NL_GEOID_H = 43;
          const pHigh   = Cesium.Cartesian3.fromDegrees(5.3, 52.2, NL_GEOID_H);
          const pGround = Cesium.Cartesian3.fromDegrees(5.3, 52.2, 0.0);
          const translation = Cesium.Cartesian3.subtract(pGround, pHigh, new Cesium.Cartesian3());
          tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);

          const BAG_COLOR = Cesium.Color.fromCssColorString('#F8FAFC');
          const BAG_EDGE_COLOR = Cesium.Color.fromCssColorString('#111827').withAlpha(0.22);
          tileset.style = new Cesium.Cesium3DTileStyle({
            color: "color('#F8FAFC')"
          });
          tileset.colorBlendMode = Cesium.Cesium3DTileColorBlendMode.REPLACE;
          tileset.colorBlendAmount = 1.0;
          const forceTileStyle = (tile) => {
            const content = tile?.content;
            if (!content) return;

            const n = content.featuresLength || 0;
            for (let i = 0; i < n; i++) {
              const feature = content.getFeature(i);
              if (!feature) continue;
              const key = this._bagFeatureKey(feature);
              const hidden = key && this._bagHiddenFeatureKeys.has(key);
              feature.show = !hidden;
              if (hidden) continue;
              const selected = (this._bagSelectedFeatureKey && key === this._bagSelectedFeatureKey) || feature === this._bagSelectedFeature;
              if (selected) {
                feature.color = Cesium.Color.fromCssColorString('#F59E0B');
              } else {
                feature.color = BAG_COLOR;
              }
            }

            const model = content._model || content._modelExperimental;
            if (model) {
              model.silhouetteColor = BAG_EDGE_COLOR;
              model.silhouetteSize = 0.35;
            }
          };
          tileset.tileVisible.addEventListener((tile) => {
            forceTileStyle(tile);
          });
          this.viewer.scene.primitives.add(tileset);
          tileset.tileLoad.addEventListener((tile) => {
            forceTileStyle(tile);
          });
          tileset.makeStyleDirty();
          this._bag3dTileset = tileset;
        },
        (err) => { console.warn('3D BAG tileset laden mislukt:', err); }
      );

      this._pitch = opts?.pitch ?? 55;
      this._bearing = opts?.bearing ?? -15;
      this.viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(this._center.lng, this._center.lat, zoomToHeight(this._zoom, this._center.lat)),
        orientation: {
          heading: Cesium.Math.toRadians(this._bearing),
          pitch: Cesium.Math.toRadians(-this._pitch),
          roll: 0
        }
      });

      this.viewer.camera.moveEnd.addEventListener(() => {
        this._updateInternalViewFromCamera();
        (this._events['moveend'] || []).forEach(cb => cb());
      });

      this.viewer.screenSpaceEventHandler.setInputAction((movement) => {
        this._onSceneClick(movement);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      setTimeout(() => (this._events['load'] || []).forEach(cb => cb()), 0);
    }

    on(name, cb) {
      if (!this._events[name]) this._events[name] = [];
      this._events[name].push(cb);
    }

    resize() { this.viewer.resize(); }

    _loadBagHiddenFromState() {
      try {
        if (typeof getProjectBagHiddenKeys === 'function') {
          this._bagHiddenFeatureKeys = new Set(getProjectBagHiddenKeys());
        }
      } catch { }
    }

    _saveBagHiddenToState() {
      try {
        if (typeof setProjectBagHiddenKeys === 'function') {
          setProjectBagHiddenKeys(Array.from(this._bagHiddenFeatureKeys));
        }
      } catch { }
    }

    _setBagDebug(text) {
      if (!this._bagDebugEl) return;
      this._bagDebugEl.textContent = text;
    }

    _bagFeatureKey(feature) {
      if (!feature || typeof feature.getProperty !== 'function') return null;
      for (const prop of this._bagKeyProps) {
        const v = feature.getProperty(prop);
        if (v !== undefined && v !== null && v !== '') return `${prop}:${v}`;
      }
      const fid = feature.featureId;
      const contentUrl = feature.content?._url || feature.content?.url || '';
      if (fid !== undefined && fid !== null) return `fid:${contentUrl}:${fid}`;
      return null;
    }

    _clearBagSelection() {
      if (!this._bagSelectedFeature) return;
      try {
        this._bagSelectedFeature.color = Cesium.Color.fromCssColorString('#F8FAFC');
      } catch { }
      this._bagSelectedFeature = null;
      this._bagSelectedFeatureKey = null;
      this._setBagDebug('BAG selected: nee');
    }

    _selectBagFeature(feature) {
      if (!feature) return;
      if (this._bagSelectedFeature && this._bagSelectedFeature !== feature) {
        try {
          this._bagSelectedFeature.color = Cesium.Color.fromCssColorString('#F8FAFC');
        } catch { }
      }
      this._bagSelectedFeature = feature;
      this._bagSelectedFeatureKey = this._bagFeatureKey(feature);
      try {
        feature.color = Cesium.Color.fromCssColorString('#F59E0B');
      } catch { }
      this._setBagDebug(`BAG selected: ja${this._bagSelectedFeatureKey ? ` (${this._bagSelectedFeatureKey})` : ''}`);
    }

    _deleteSelectedBagFeature() {
      const feature = this._bagSelectedFeature;
      if (!feature) return;
      const key = this._bagFeatureKey(feature);
      if (!key) return;
      this._bagHiddenFeatureKeys.add(key);
      this._saveBagHiddenToState();
      try {
        feature.show = false;
      } catch { }
      this._bagSelectedFeature = null;
      this._bagSelectedFeatureKey = null;
      if (this._bag3dTileset) this._bag3dTileset.makeStyleDirty();
      this._setBagDebug(`BAG hidden: ${this._bagHiddenFeatureKeys.size}`);
    }

    _onSceneClick(movement) {
      const pos = movement?.position;
      if (!pos) { this._clearBagSelection(); return; }
      const picks = this.viewer.scene.drillPick(pos, 20) || [];
      const picked = picks.find((p) => p && typeof p.getProperty === 'function');

      if (!picked) {
        this._setBagDebug(`Klik: geen feature (${picks.length} picks)`);
        this._clearBagSelection();
        return;
      }
      this._setBagDebug(`Klik: feature gevonden (${picks.length} picks)`);
      this._selectBagFeature(picked);
    }

    _handleGlobalKeyDown(e) {
      if (e.key !== 'Delete') return;
      const t = e.target;
      const tag = t?.tagName ? t.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
      if (!this._bagSelectedFeature) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      this._deleteSelectedBagFeature();
    }

    _updateInternalViewFromCamera() {
      try {
        const canvas = this.viewer.scene.canvas;
        const pos = new Cesium.Cartesian2((canvas.clientWidth || 0) / 2, (canvas.clientHeight || 0) / 2);
        const cart = this.viewer.camera.pickEllipsoid(pos, this.viewer.scene.globe.ellipsoid);
        if (cart) {
          const c = Cesium.Cartographic.fromCartesian(cart);
          this._center = { lng: Cesium.Math.toDegrees(c.longitude), lat: Cesium.Math.toDegrees(c.latitude) };
        }
        const camCarto = this.viewer.camera.positionCartographic;
        if (camCarto && Number.isFinite(camCarto.height)) {
          this._zoom = heightToZoom(camCarto.height, this._center.lat);
        }
        this._bearing = Cesium.Math.toDegrees(this.viewer.camera.heading);
        this._pitch = -Cesium.Math.toDegrees(this.viewer.camera.pitch);
      } catch { }
    }

    setCenter(center) {
      this._center = { lng: center[0], lat: center[1] };
      this.viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(this._center.lng, this._center.lat, zoomToHeight(this._zoom, this._center.lat)),
        orientation: { heading: Cesium.Math.toRadians(this._bearing), pitch: Cesium.Math.toRadians(-this._pitch), roll: 0 }
      });
    }

    getCenter() {
      this._updateInternalViewFromCamera();
      return { lng: this._center.lng, lat: this._center.lat };
    }

    setZoom(zoom) {
      this._zoom = zoom;
      this.viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(this._center.lng, this._center.lat, zoomToHeight(this._zoom, this._center.lat)),
        orientation: { heading: Cesium.Math.toRadians(this._bearing), pitch: Cesium.Math.toRadians(-this._pitch), roll: 0 }
      });
    }

    getZoom() {
      this._updateInternalViewFromCamera();
      return this._zoom;
    }

    addSource(id, src) {
      this._sources[id] = src?.data || { type: 'FeatureCollection', features: [] };
      return this.getSource(id);
    }

    getSource(id) {
      if (!this._sources[id]) return null;
      return new SourceRef(this, id);
    }

    addLayer(layerDef) {
      const ds = new Cesium.CustomDataSource(layerDef.id);
      this.viewer.dataSources.add(ds);
      this._layers[layerDef.id] = { def: layerDef, ds };
      this._renderLayer(layerDef.id);
    }

    getLayer(id) { return this._layers[id]?.def || null; }

    _rerenderBySource(sourceId) {
      Object.keys(this._layers).forEach(id => {
        if (this._layers[id].def.source === sourceId) this._renderLayer(id);
      });
    }

    _renderLayer(id) {
      const rec = this._layers[id];
      if (!rec) return;
      rec.ds.entities.removeAll();
      const def = rec.def;
      const fc = this._sources[def.source] || { type: 'FeatureCollection', features: [] };
      const features = fc.features || [];

      features.forEach(f => {
        const props = f.properties || {};
        const rings = geomToRings(f.geometry);

        if (def.type === 'fill' || def.type === 'fill-extrusion') {
          const fillColorExpr = def.type === 'fill-extrusion'
            ? (def.paint?.['fill-extrusion-color'] ?? def.paint?.['fill-color'])
            : def.paint?.['fill-color'];
          const fillOpacityExpr = def.type === 'fill-extrusion'
            ? (def.paint?.['fill-extrusion-opacity'] ?? def.paint?.['fill-opacity'])
            : def.paint?.['fill-opacity'];
          const fill = colorFrom(evalExpr(fillColorExpr, props), '#7C3AED');
          const alpha = Number(evalExpr(fillOpacityExpr, props) ?? 0.22);
          const outline = colorFrom(evalExpr(def.paint?.['fill-outline-color'], props), '#000000');
          const h = Number(evalExpr(def.paint?.['fill-extrusion-height'], props) ?? 0);
          const b = Number(evalExpr(def.paint?.['fill-extrusion-base'], props) ?? 0);
          rings.forEach(r => rec.ds.entities.add({
            polygon: {
              hierarchy: ringToCartesian(r, b),
              material: fill.withAlpha(alpha),
              outline: true,
              outlineColor: outline.withAlpha(def.type === 'fill-extrusion' ? 0.9 : 0.8),
              extrudedHeight: def.type === 'fill-extrusion' ? h : undefined,
            }
          }));
        }

        if (def.type === 'line') {
          const lc = colorFrom(evalExpr(def.paint?.['line-color'], props), '#4C1D95');
          const lw = Number(evalExpr(def.paint?.['line-width'], props) ?? 1.5);
          rings.forEach(r => rec.ds.entities.add({
            polyline: { positions: ringToCartesian(r, 0), width: lw, material: lc }
          }));
        }

        if (def.type === 'circle' && f.geometry?.type === 'Point') {
          rec.ds.entities.add({
            position: Cesium.Cartesian3.fromDegrees(f.geometry.coordinates[0], f.geometry.coordinates[1], 0),
            point: {
              pixelSize: Number(evalExpr(def.paint?.['circle-radius'], props) ?? 6),
              color: colorFrom(evalExpr(def.paint?.['circle-color'], props), '#F59E0B'),
              outlineColor: colorFrom(evalExpr(def.paint?.['circle-stroke-color'], props), '#B45309'),
              outlineWidth: Number(evalExpr(def.paint?.['circle-stroke-width'], props) ?? 1)
            }
          });
        }

        if (def.type === 'symbol' && f.geometry?.type === 'Point') {
          rec.ds.entities.add({
            position: Cesium.Cartesian3.fromDegrees(f.geometry.coordinates[0], f.geometry.coordinates[1], 0),
            label: {
              text: String(evalExpr(def.layout?.['text-field'], props) ?? ''),
              font: `${Number(evalExpr(def.layout?.['text-size'], props) ?? 12)}px sans-serif`,
              fillColor: colorFrom(evalExpr(def.paint?.['text-color'], props), '#333'),
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -10)
            }
          });
        }
      });
    }
  }

  window.maplibregl = window.maplibregl || {};
  window.maplibregl.Map = CesiumLibreMap;
})();
