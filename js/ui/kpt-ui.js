/**
 * KPT Bryce 1.0 Tactile UI Manager
 * Handles 3D Trackballs (Camera Orbit & Sun Position), Preset Selection, and Performance Scaling.
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
  }

  initTrackballs() {
    const camOrb = document.getElementById('cameraTrackball');
    const camHandle = document.getElementById('cameraOrbHandle');

    const sunOrb = document.getElementById('sunTrackball');
    const sunHandle = document.getElementById('sunOrbHandle');

    if (camOrb) {
      camOrb.addEventListener('mousedown', (e) => { this.isDraggingCamOrb = true; });
      window.addEventListener('mouseup', () => { this.isDraggingCamOrb = false; });
      window.addEventListener('mousemove', (e) => {
        if (!this.isDraggingCamOrb) return;
        const rect = camOrb.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2.0;
        const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2.0;

        this.camAzimuth = nx * 180.0;
        this.camElevation = Math.max(-20, Math.min(85, -ny * 60.0));

        camHandle.style.transform = `translate(${nx * 24}px, ${ny * 24}px)`;

        const dist = 10.0;
        const azRad = (this.camAzimuth * Math.PI) / 180;
        const elRad = (this.camElevation * Math.PI) / 180;

        const x = dist * Math.cos(elRad) * Math.sin(azRad);
        const y = Math.max(0.5, dist * Math.sin(elRad) + 1.5);
        const z = dist * Math.cos(elRad) * Math.cos(azRad);

        this.renderer.state.cameraPos = [x, y, z];
        if (this.onStateChange) this.onStateChange();
      });
    }

    if (sunOrb) {
      sunOrb.addEventListener('mousedown', (e) => { this.isDraggingSunOrb = true; });
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
        cameraPos: [0.0, 4.5, -9.0],
        cameraTarget: [0.0, 1.2, 0.0],
        sunAzimuth: 45.0,
        sunElevation: 18.0,
        sunColor: [1.0, 0.7, 0.4],
        skyColorHorizon: [0.9, 0.4, 0.35],
        skyColorZenith: [0.12, 0.18, 0.45],
        fogDensity: 0.45,
        fogColor: [0.8, 0.5, 0.4],
        waterLevel: 0.6,
        waterColor: [0.05, 0.35, 0.45],
        waterReflectivity: 0.65,
        terrainScale: 0.8,
        terrainHeight: 3.2,
        paletteMode: 0,
        spherePos: [1.2, 1.8, 2.0],
        sphereRadius: 0.8,
        sphereReflectivity: 0.95
      },
      emerald: {
        cameraPos: [-6.0, 3.5, -7.0],
        cameraTarget: [0.0, 1.0, 0.0],
        sunAzimuth: 120.0,
        sunElevation: 45.0,
        sunColor: [1.0, 0.98, 0.85],
        skyColorHorizon: [0.5, 0.85, 0.9],
        skyColorZenith: [0.05, 0.45, 0.85],
        fogDensity: 0.25,
        fogColor: [0.45, 0.75, 0.7],
        waterLevel: 0.8,
        waterColor: [0.0, 0.4, 0.35],
        waterReflectivity: 0.8,
        terrainScale: 1.0,
        terrainHeight: 2.8,
        paletteMode: 1,
        spherePos: [-0.5, 1.5, 1.0],
        sphereRadius: 0.7,
        sphereReflectivity: 0.9
      },
      alien: {
        cameraPos: [4.0, 5.0, -8.0],
        cameraTarget: [0.0, 0.8, 0.0],
        sunAzimuth: 210.0,
        sunElevation: 25.0,
        sunColor: [0.4, 0.9, 1.0],
        skyColorHorizon: [0.65, 0.2, 0.6],
        skyColorZenith: [0.1, 0.05, 0.3],
        fogDensity: 0.6,
        fogColor: [0.5, 0.2, 0.55],
        waterLevel: 0.5,
        waterColor: [0.3, 0.05, 0.4],
        waterReflectivity: 0.5,
        terrainScale: 0.7,
        terrainHeight: 4.0,
        paletteMode: 2,
        spherePos: [0.0, 2.2, 0.0],
        sphereRadius: 1.0,
        sphereReflectivity: 0.85
      },
      gold: {
        cameraPos: [0.0, 6.0, -10.0],
        cameraTarget: [0.0, 1.0, 0.0],
        sunAzimuth: 15.0,
        sunElevation: 55.0,
        sunColor: [1.0, 0.85, 0.5],
        skyColorHorizon: [0.95, 0.75, 0.5],
        skyColorZenith: [0.4, 0.25, 0.15],
        fogDensity: 0.3,
        fogColor: [0.85, 0.65, 0.45],
        waterLevel: 0.4,
        waterColor: [0.4, 0.25, 0.1],
        waterReflectivity: 0.7,
        terrainScale: 0.9,
        terrainHeight: 3.5,
        paletteMode: 3,
        spherePos: [2.0, 1.6, -1.0],
        sphereRadius: 0.9,
        sphereReflectivity: 0.92
      }
    };

    presetSelect.addEventListener('change', (e) => {
      const pKey = e.target.value;
      if (presets[pKey]) {
        Object.assign(this.renderer.state, presets[pKey]);
        this.updateUIFromState();
        if (this.onStateChange) this.onStateChange();
      }
    });
  }

  updateUIFromState() {
    const s = this.renderer.state;
    const updateVal = (id, val, dispId) => {
      const elem = document.getElementById(id);
      const disp = document.getElementById(dispId);
      if (elem) elem.value = val;
      if (disp) disp.textContent = typeof val === 'number' ? val.toFixed(2) : val;
    };

    updateVal('terrainHeightSlider', s.terrainHeight, 'valTerrainHeight');
    updateVal('terrainScaleSlider', s.terrainScale, 'valTerrainScale');
    updateVal('fogDensitySlider', s.fogDensity, 'valFogDensity');
    updateVal('waterLevelSlider', s.waterLevel, 'valWaterLevel');
    updateVal('waterReflectSlider', s.waterReflectivity, 'valWaterReflect');
    updateVal('sphereReflectSlider', s.sphereReflectivity, 'valSphereReflect');
  }
}
