/**
 * KPT Bryce 1.0 Tactile UI Manager
 * Handles 3D Trackballs, Camera Height (Up/Down) & Distance, Presets, Dramatic Terrain Styles, and Render Scaling.
 */

export class KptUIManager {
  constructor(renderer, onStateChange) {
    this.renderer = renderer;
    this.onStateChange = onStateChange;

    this.isDraggingCamOrb = false;
    this.isDraggingSunOrb = false;

    this.camAzimuth = 180.0;
    this.camElevation = 15.0;

    this.initTrackballs();
    this.initPresetSelector();
    this.initSliderControls();
    this.initPerformanceControls();
    this.initNewFeatures();
  }

  updateCameraTransform() {
    const dist = this.renderer.state.cameraDistance || 10.0;
    const heightOffset = (this.renderer.state.cameraHeight - 5.0) || 0.0;
    const azRad = (this.camAzimuth * Math.PI) / 180;
    const elRad = (this.camElevation * Math.PI) / 180;

    const x = dist * Math.cos(elRad) * Math.sin(azRad);
    const y = Math.max(0.2, heightOffset + dist * Math.sin(elRad) + 2.0);
    const z = dist * Math.cos(elRad) * Math.cos(azRad);

    this.renderer.state.cameraPos = [x, y, z];
  }

  initTrackballs() {
    const camOrb = document.getElementById('cameraTrackball');
    const camHandle = document.getElementById('cameraOrbHandle');

    const sunOrb = document.getElementById('sunTrackball');
    const sunHandle = document.getElementById('sunOrbHandle');

    if (camOrb) {
      camOrb.addEventListener('mousedown', () => { this.isDraggingCamOrb = true; });
      window.addEventListener('mouseup', () => { this.isDraggingCamOrb = false; });
      window.addEventListener('mousemove', (e) => {
        if (!this.isDraggingCamOrb) return;
        const rect = camOrb.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2.0;
        const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2.0;

        this.camAzimuth = nx * 180.0;
        this.camElevation = Math.max(-25, Math.min(85, -ny * 65.0));

        camHandle.style.transform = `translate(${nx * 24}px, ${ny * 24}px)`;

        this.updateCameraTransform();
        if (this.onStateChange) this.onStateChange();
      });
    }

    if (sunOrb) {
      sunOrb.addEventListener('mousedown', () => { this.isDraggingSunOrb = true; });
      window.addEventListener('mouseup', () => { this.isDraggingSunOrb = false; });
      window.addEventListener('mousemove', (e) => {
        if (!this.isDraggingSunOrb) return;
        const rect = sunOrb.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2.0;
        const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2.0;

        const az = nx * 180.0;
        const el = Math.max(5, Math.min(85, -ny * 75.0 + 30.0));

        sunHandle.style.transform = `translate(${nx * 24}px, ${ny * 24}px)`;

        this.renderer.state.sunAzimuth = az;
        this.renderer.state.sunElevation = el;
        if (this.onStateChange) this.onStateChange();
      });
    }
  }

  hexToRGB(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return [(num >> 16 & 255) / 255.0, (num >> 8 & 255) / 255.0, (num & 255) / 255.0];
  }

  rgbToHex(rgb) {
    const toHex = (n) => {
      const h = Math.round(n * 255).toString(16);
      return h.length === 1 ? '0' + h : h;
    };
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
  }

  initNewFeatures() {
    // 0. Camera Altitude Height (Up/Down) & Distance Controls
    const cameraHeightSlider = document.getElementById('cameraHeightSlider');
    const valCameraHeight = document.getElementById('valCameraHeight');
    if (cameraHeightSlider) {
      cameraHeightSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.renderer.state.cameraHeight = val;
        if (valCameraHeight) valCameraHeight.textContent = val.toFixed(1);
        this.updateCameraTransform();
        if (this.onStateChange) this.onStateChange();
      });
    }

    const cameraDistanceSlider = document.getElementById('cameraDistanceSlider');
    const valCameraDistance = document.getElementById('valCameraDistance');
    if (cameraDistanceSlider) {
      cameraDistanceSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.renderer.state.cameraDistance = val;
        if (valCameraDistance) valCameraDistance.textContent = val.toFixed(1);
        this.updateCameraTransform();
        if (this.onStateChange) this.onStateChange();
      });
    }

    // 0a. Dramatic Terrain Style Selector
    const terrainStyleSelect = document.getElementById('terrainStyleSelect');
    if (terrainStyleSelect) {
      terrainStyleSelect.addEventListener('change', (e) => {
        const style = parseInt(e.target.value);
        this.renderer.state.terrainStyle = style;
        this.renderer.regenerateHeightmap();
        if (this.onStateChange) this.onStateChange();
      });
    }

    // 0b. Terrain Domain Mode (Island vs Infinite)
    const terrainDomainSelect = document.getElementById('terrainDomainSelect');
    if (terrainDomainSelect) {
      terrainDomainSelect.addEventListener('change', (e) => {
        const mode = parseInt(e.target.value);
        this.renderer.state.terrainDomainMode = mode;
        this.renderer.regenerateHeightmap();
        if (this.onStateChange) this.onStateChange();
      });
    }

    // 0c. Peak Steepness / Exaggeration Slider
    const steepnessSlider = document.getElementById('steepnessSlider');
    const valSteepness = document.getElementById('valSteepness');
    if (steepnessSlider) {
      steepnessSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.renderer.state.steepness = val;
        if (valSteepness) valSteepness.textContent = val.toFixed(2);
        this.renderer.regenerateHeightmap();
        if (this.onStateChange) this.onStateChange();
      });
    }

    // 1. Random Seed Controls
    const btnRandomSeed = document.getElementById('btnRandomSeed');
    const inputSeed = document.getElementById('inputSeed');

    if (btnRandomSeed) {
      btnRandomSeed.addEventListener('click', () => {
        const newSeed = Math.floor(Math.random() * 999999);
        this.renderer.state.seed = newSeed;
        if (inputSeed) inputSeed.value = newSeed;
        this.renderer.regenerateHeightmap();
        if (this.onStateChange) this.onStateChange();
      });
    }

    if (inputSeed) {
      inputSeed.addEventListener('change', (e) => {
        const val = parseInt(e.target.value) || 1337;
        this.renderer.state.seed = val;
        this.renderer.regenerateHeightmap();
        if (this.onStateChange) this.onStateChange();
      });
    }

    // 2. Remove / Show Primitive Sphere Toggle
    const chkShowSphere = document.getElementById('chkShowSphere');
    if (chkShowSphere) {
      chkShowSphere.addEventListener('change', (e) => {
        this.renderer.state.showSphere = e.target.checked ? 1 : 0;
        if (this.onStateChange) this.onStateChange();
      });
    }

    // 3. Sun Intensity & Size Controls
    const sunIntensitySlider = document.getElementById('sunIntensitySlider');
    const valSunIntensity = document.getElementById('valSunIntensity');
    if (sunIntensitySlider) {
      sunIntensitySlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.renderer.state.sunIntensity = val;
        if (valSunIntensity) valSunIntensity.textContent = val.toFixed(2);
        if (this.onStateChange) this.onStateChange();
      });
    }

    const sunSizeSlider = document.getElementById('sunSizeSlider');
    const valSunSize = document.getElementById('valSunSize');
    if (sunSizeSlider) {
      sunSizeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.renderer.state.sunSize = val;
        if (valSunSize) valSunSize.textContent = val.toFixed(2);
        if (this.onStateChange) this.onStateChange();
      });
    }

    // 4. Draw Distance, Mesh Detail Quality & Mesh Smoothing Sliders
    const drawDistanceSlider = document.getElementById('drawDistanceSlider');
    const valDrawDistance = document.getElementById('valDrawDistance');
    if (drawDistanceSlider) {
      drawDistanceSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.renderer.state.drawDistance = val;
        if (valDrawDistance) valDrawDistance.textContent = val.toFixed(0);
        if (this.onStateChange) this.onStateChange();
      });
    }

    const meshQualitySlider = document.getElementById('meshQualitySlider');
    const valMeshQuality = document.getElementById('valMeshQuality');
    if (meshQualitySlider) {
      meshQualitySlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.renderer.state.meshQuality = val;
        if (valMeshQuality) valMeshQuality.textContent = val.toFixed(2);
        this.renderer.regenerateHeightmap();
        if (this.onStateChange) this.onStateChange();
      });
    }

    const meshSmoothingSlider = document.getElementById('meshSmoothingSlider');
    const valMeshSmoothing = document.getElementById('valMeshSmoothing');
    if (meshSmoothingSlider) {
      meshSmoothingSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.renderer.state.meshSmoothing = val;
        if (valMeshSmoothing) valMeshSmoothing.textContent = val.toFixed(2);
        this.renderer.regenerateHeightmap();
        if (this.onStateChange) this.onStateChange();
      });
    }

    // 5. Color Pickers (Sky Horizon, Zenith, Fog Haze, Sun Color, Water)
    const bindColorPicker = (id, stateKey) => {
      const picker = document.getElementById(id);
      if (!picker) return;
      picker.addEventListener('input', (e) => {
        this.renderer.state[stateKey] = this.hexToRGB(e.target.value);
        if (this.onStateChange) this.onStateChange();
      });
    };

    bindColorPicker('pickerSkyHorizon', 'skyColorHorizon');
    bindColorPicker('pickerSkyZenith', 'skyColorZenith');
    bindColorPicker('pickerFogColor', 'fogColor');
    bindColorPicker('pickerSunColor', 'sunColor');
    bindColorPicker('pickerWaterColor', 'waterColor');

    // 6. Sky / Ground / Haze Color Scheme Combos
    const colorComboSelect = document.getElementById('colorComboSelect');
    if (colorComboSelect) {
      const combos = {
        sunset: {
          skyHorizon: [0.9, 0.4, 0.35],
          skyZenith: [0.12, 0.18, 0.45],
          fog: [0.8, 0.5, 0.4],
          sun: [1.0, 0.7, 0.4],
          paletteMode: 0
        },
        emerald: {
          skyHorizon: [0.5, 0.85, 0.9],
          skyZenith: [0.05, 0.45, 0.85],
          fog: [0.45, 0.75, 0.7],
          sun: [1.0, 0.98, 0.85],
          paletteMode: 1
        },
        cyberpunk: {
          skyHorizon: [0.9, 0.1, 0.6],
          skyZenith: [0.1, 0.0, 0.3],
          fog: [0.7, 0.1, 0.5],
          sun: [0.0, 0.9, 1.0],
          paletteMode: 2
        },
        golden: {
          skyHorizon: [0.95, 0.75, 0.5],
          skyZenith: [0.4, 0.25, 0.15],
          fog: [0.85, 0.65, 0.45],
          sun: [1.0, 0.85, 0.5],
          paletteMode: 3
        },
        midnight: {
          skyHorizon: [0.1, 0.15, 0.3],
          skyZenith: [0.02, 0.04, 0.1],
          fog: [0.08, 0.12, 0.25],
          sun: [0.7, 0.8, 1.0],
          paletteMode: 0
        }
      };

      colorComboSelect.addEventListener('change', (e) => {
        const combo = combos[e.target.value];
        if (combo) {
          this.renderer.state.skyColorHorizon = combo.skyHorizon;
          this.renderer.state.skyColorZenith = combo.skyZenith;
          this.renderer.state.fogColor = combo.fog;
          this.renderer.state.sunColor = combo.sun;
          this.renderer.state.paletteMode = combo.paletteMode;
          this.updateUIFromState();
          if (this.onStateChange) this.onStateChange();
        }
      });
    }
  }

  initPerformanceControls() {
    const renderScaleSelect = document.getElementById('renderScaleSelect');
    if (!renderScaleSelect) return;

    renderScaleSelect.addEventListener('change', (e) => {
      const scale = parseFloat(e.target.value);
      this.renderer.state.renderScale = scale;
      const canvas = this.renderer.canvas;
      const parent = canvas.parentElement;
      if (parent) {
        this.renderer.resizeCanvas(parent.clientWidth, parent.clientHeight);
      }
      if (this.onStateChange) this.onStateChange();
    });
  }

  initSliderControls() {
    const bindSlider = (id, stateKey, displayId, factor = 1.0) => {
      const elem = document.getElementById(id);
      const disp = document.getElementById(displayId);
      if (!elem) return;

      elem.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) * factor;
        this.renderer.state[stateKey] = val;
        if (disp) disp.textContent = val.toFixed(2);
        if (this.onStateChange) this.onStateChange();
      });
    };

    bindSlider('terrainHeightSlider', 'terrainHeight', 'valTerrainHeight');
    bindSlider('terrainScaleSlider', 'terrainScale', 'valTerrainScale');
    bindSlider('fogDensitySlider', 'fogDensity', 'valFogDensity');
    bindSlider('waterLevelSlider', 'waterLevel', 'valWaterLevel');
    bindSlider('waterReflectSlider', 'waterReflectivity', 'valWaterReflect');
    bindSlider('sphereReflectSlider', 'sphereReflectivity', 'valSphereReflect');
  }

  initPresetSelector() {
    const presetSelect = document.getElementById('presetSelect');
    if (!presetSelect) return;

    const presets = {
      sunset: {
        cameraPos: [0.0, 5.0, -9.5],
        cameraTarget: [0.0, 1.2, 0.0],
        cameraHeight: 5.0,
        cameraDistance: 10.0,
        sunAzimuth: 45.0,
        sunElevation: 18.0,
        sunColor: [1.0, 0.7, 0.4],
        sunIntensity: 1.2,
        sunSize: 1.0,
        skyColorHorizon: [0.9, 0.4, 0.35],
        skyColorZenith: [0.12, 0.18, 0.45],
        drawDistance: 150.0,
        fogDensity: 0.30,
        fogColor: [0.8, 0.5, 0.4],
        waterLevel: 0.45,
        waterColor: [0.05, 0.35, 0.45],
        waterReflectivity: 0.65,
        terrainScale: 0.8,
        terrainHeight: 4.2,
        meshQuality: 1.2,
        meshSmoothing: 0.5,
        terrainDomainMode: 0,
        terrainStyle: 1,
        steepness: 1.25,
        paletteMode: 0,
        showSphere: 1,
        spherePos: [1.2, 2.2, 2.0],
        sphereRadius: 0.8,
        sphereReflectivity: 0.95
      },
      emerald: {
        cameraPos: [-6.0, 4.0, -7.5],
        cameraTarget: [0.0, 1.0, 0.0],
        cameraHeight: 4.0,
        cameraDistance: 9.5,
        sunAzimuth: 120.0,
        sunElevation: 45.0,
        sunColor: [1.0, 0.98, 0.85],
        sunIntensity: 1.2,
        sunSize: 0.8,
        skyColorHorizon: [0.5, 0.85, 0.9],
        skyColorZenith: [0.05, 0.45, 0.85],
        drawDistance: 160.0,
        fogDensity: 0.22,
        fogColor: [0.45, 0.75, 0.7],
        waterLevel: 0.55,
        waterColor: [0.0, 0.4, 0.35],
        waterReflectivity: 0.8,
        terrainScale: 1.0,
        terrainHeight: 3.5,
        meshQuality: 1.2,
        meshSmoothing: 0.8,
        terrainDomainMode: 0,
        terrainStyle: 2,
        steepness: 1.1,
        paletteMode: 1,
        showSphere: 1,
        spherePos: [-0.5, 1.8, 1.0],
        sphereRadius: 0.7,
        sphereReflectivity: 0.9
      },
      alien: {
        cameraPos: [4.0, 5.5, -8.5],
        cameraTarget: [0.0, 0.8, 0.0],
        cameraHeight: 5.5,
        cameraDistance: 9.0,
        sunAzimuth: 210.0,
        sunElevation: 25.0,
        sunColor: [0.4, 0.9, 1.0],
        sunIntensity: 1.5,
        sunSize: 1.5,
        skyColorHorizon: [0.65, 0.2, 0.6],
        skyColorZenith: [0.1, 0.05, 0.3],
        drawDistance: 100.0,
        fogDensity: 0.45,
        fogColor: [0.5, 0.2, 0.55],
        waterLevel: 0.4,
        waterColor: [0.3, 0.05, 0.4],
        waterReflectivity: 0.5,
        terrainScale: 0.7,
        terrainHeight: 5.0,
        meshQuality: 1.5,
        meshSmoothing: 0.3,
        terrainDomainMode: 1,
        terrainStyle: 4,
        steepness: 1.6,
        paletteMode: 2,
        showSphere: 1,
        spherePos: [0.0, 2.5, 0.0],
        sphereRadius: 1.0,
        sphereReflectivity: 0.85
      },
      gold: {
        cameraPos: [0.0, 6.5, -10.5],
        cameraTarget: [0.0, 1.0, 0.0],
        cameraHeight: 6.5,
        cameraDistance: 10.5,
        sunAzimuth: 15.0,
        sunElevation: 55.0,
        sunColor: [1.0, 0.85, 0.5],
        sunIntensity: 1.1,
        sunSize: 1.2,
        skyColorHorizon: [0.95, 0.75, 0.5],
        skyColorZenith: [0.4, 0.25, 0.15],
        drawDistance: 150.0,
        fogDensity: 0.22,
        fogColor: [0.85, 0.65, 0.45],
        waterLevel: 0.3,
        waterColor: [0.4, 0.25, 0.1],
        waterReflectivity: 0.7,
        terrainScale: 0.9,
        terrainHeight: 4.5,
        meshQuality: 1.2,
        meshSmoothing: 0.4,
        terrainDomainMode: 1,
        terrainStyle: 3,
        steepness: 1.4,
        paletteMode: 3,
        showSphere: 0,
        spherePos: [2.0, 1.8, -1.0],
        sphereRadius: 0.9,
        sphereReflectivity: 0.92
      }
    };

    presetSelect.addEventListener('change', (e) => {
      const pKey = e.target.value;
      if (presets[pKey]) {
        Object.assign(this.renderer.state, presets[pKey]);
        this.updateUIFromState();
        this.renderer.regenerateHeightmap();
        if (this.onStateChange) this.onStateChange();
      }
    });
  }

  updateUIFromState() {
    const s = this.renderer.state;
    const updateVal = (id, val, dispId, decimals = 2) => {
      const elem = document.getElementById(id);
      const disp = document.getElementById(dispId);
      if (elem) elem.value = val;
      if (disp) disp.textContent = typeof val === 'number' ? val.toFixed(decimals) : val;
    };

    updateVal('cameraHeightSlider', s.cameraHeight, 'valCameraHeight', 1);
    updateVal('cameraDistanceSlider', s.cameraDistance, 'valCameraDistance', 1);
    updateVal('terrainHeightSlider', s.terrainHeight, 'valTerrainHeight', 2);
    updateVal('terrainScaleSlider', s.terrainScale, 'valTerrainScale', 2);
    updateVal('drawDistanceSlider', s.drawDistance, 'valDrawDistance', 0);
    updateVal('meshQualitySlider', s.meshQuality, 'valMeshQuality', 2);
    updateVal('meshSmoothingSlider', s.meshSmoothing, 'valMeshSmoothing', 2);
    updateVal('steepnessSlider', s.steepness, 'valSteepness', 2);
    updateVal('fogDensitySlider', s.fogDensity, 'valFogDensity', 2);
    updateVal('waterLevelSlider', s.waterLevel, 'valWaterLevel', 2);
    updateVal('waterReflectSlider', s.waterReflectivity, 'valWaterReflect', 2);
    updateVal('sphereReflectSlider', s.sphereReflectivity, 'valSphereReflect', 2);
    updateVal('sunIntensitySlider', s.sunIntensity, 'valSunIntensity', 2);
    updateVal('sunSizeSlider', s.sunSize, 'valSunSize', 2);

    const terrainStyleSelect = document.getElementById('terrainStyleSelect');
    if (terrainStyleSelect) terrainStyleSelect.value = s.terrainStyle;

    const terrainDomainSelect = document.getElementById('terrainDomainSelect');
    if (terrainDomainSelect) terrainDomainSelect.value = s.terrainDomainMode;

    const chkShowSphere = document.getElementById('chkShowSphere');
    if (chkShowSphere) chkShowSphere.checked = s.showSphere === 1;

    const inputSeed = document.getElementById('inputSeed');
    if (inputSeed) inputSeed.value = s.seed;

    const updateColor = (id, rgb) => {
      const picker = document.getElementById(id);
      if (picker) picker.value = this.rgbToHex(rgb);
    };

    updateColor('pickerSkyHorizon', s.skyColorHorizon);
    updateColor('pickerSkyZenith', s.skyColorZenith);
    updateColor('pickerFogColor', s.fogColor);
    updateColor('pickerSunColor', s.sunColor);
    updateColor('pickerWaterColor', s.waterColor);
  }
}
