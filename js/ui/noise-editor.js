/**
 * KPT Bryce 1.0 Heightmap Noise Editor
 * Interactive 2D Canvas Painter with Raise (White), Lower (Black), and Smooth Brushes.
 * Live-syncs 2D canvas brush strokes to WebGL 3D Raytracer in real-time.
 */

export class NoiseEditor {
  constructor(renderer, onUpdate) {
    this.renderer = renderer;
    this.onUpdate = onUpdate;

    this.modalElem = null;
    this.canvas2D = null;
    this.ctx2D = null;

    this.isDrawing = false;
    this.currentTool = 'raise'; // 'raise' (white), 'lower' (black), 'smooth'
    this.brushSize = 25;
    this.brushStrength = 0.25;

    this.heightData = new Float32Array(512 * 512);

    this.initDOM();
  }

  initDOM() {
    this.modalElem = document.getElementById('noiseEditorModal');
    this.canvas2D = document.getElementById('heightmapCanvas');
    if (!this.canvas2D) return;

    this.ctx2D = this.canvas2D.getContext('2d');
    this.canvas2D.width = 512;
    this.canvas2D.height = 512;

    this.initEvents();
  }

  initEvents() {
    const canvas = this.canvas2D;
    if (!canvas) return;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    canvas.addEventListener('mousedown', (e) => {
      this.isDrawing = true;
      const pos = getPos(e);
      this.paintAt(pos.x, pos.y);
    });

    window.addEventListener('mouseup', () => {
      this.isDrawing = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDrawing) return;
      const pos = getPos(e);
      this.paintAt(pos.x, pos.y);
    });

    // Tool Selector Buttons
    const btnToolRaise = document.getElementById('btnToolRaise');
    const btnToolLower = document.getElementById('btnToolLower');
    const btnToolSmooth = document.getElementById('btnToolSmooth');

    const setTool = (tool, activeBtn) => {
      this.currentTool = tool;
      [btnToolRaise, btnToolLower, btnToolSmooth].forEach(b => b?.classList.remove('active'));
      activeBtn?.classList.add('active');
    };

    if (btnToolRaise) btnToolRaise.addEventListener('click', () => setTool('raise', btnToolRaise));
    if (btnToolLower) btnToolLower.addEventListener('click', () => setTool('lower', btnToolLower));
    if (btnToolSmooth) btnToolSmooth.addEventListener('click', () => setTool('smooth', btnToolSmooth));

    // Sliders
    const brushSizeSlider = document.getElementById('brushSizeSlider');
    const valBrushSize = document.getElementById('valBrushSize');
    if (brushSizeSlider) {
      brushSizeSlider.addEventListener('input', (e) => {
        this.brushSize = parseInt(e.target.value);
        if (valBrushSize) valBrushSize.textContent = `${this.brushSize}px`;
      });
    }

    const brushStrengthSlider = document.getElementById('brushStrengthSlider');
    const valBrushStrength = document.getElementById('valBrushStrength');
    if (brushStrengthSlider) {
      brushStrengthSlider.addEventListener('input', (e) => {
        this.brushStrength = parseFloat(e.target.value);
        if (valBrushStrength) valBrushStrength.textContent = this.brushStrength.toFixed(2);
      });
    }

    // Canvas Actions
    const btnInvertHeight = document.getElementById('btnInvertHeight');
    if (btnInvertHeight) {
      btnInvertHeight.addEventListener('click', () => this.invertHeightmap());
    }

    const btnSmoothAll = document.getElementById('btnSmoothAll');
    if (btnSmoothAll) {
      btnSmoothAll.addEventListener('click', () => this.smoothAllHeightmap());
    }

    const btnResetNoise = document.getElementById('btnResetNoise');
    if (btnResetNoise) {
      btnResetNoise.addEventListener('click', () => {
        this.renderer.regenerateHeightmap();
        this.syncFromRenderer();
      });
    }

    // Modal Visibility Buttons
    const btnOpenNoiseEditor = document.getElementById('btnOpenNoiseEditor');
    const btnCloseNoiseEditor = document.getElementById('btnCloseNoiseEditor');

    if (btnOpenNoiseEditor) {
      btnOpenNoiseEditor.addEventListener('click', () => {
        this.syncFromRenderer();
        if (this.modalElem) this.modalElem.style.display = 'flex';
      });
    }

    if (btnCloseNoiseEditor) {
      btnCloseNoiseEditor.addEventListener('click', () => {
        if (this.modalElem) this.modalElem.style.display = 'none';
      });
    }
  }

  // Populate 2D Canvas Editor from current WebGL heightmap texture data
  syncFromRenderer() {
    const gl = this.renderer.gl;
    const texSize = 512;

    const imgData = this.ctx2D.createImageData(texSize, texSize);
    const d = imgData.data;

    // Generate heightmap array
    const { data } = this.renderer.fractalGen.generateHeightmapTexture(
      texSize,
      Math.min(8, Math.max(4, Math.floor(this.renderer.state.octaves * this.renderer.state.meshQuality))),
      2.5,
      this.renderer.state.seed,
      this.renderer.state.meshSmoothing,
      this.renderer.state.terrainStyle,
      this.renderer.state.steepness
    );

    for (let i = 0; i < texSize * texSize; i++) {
      const rHigh = data[i * 4];
      const gLow  = data[i * 4 + 1];
      const val16 = rHigh * 256 + gLow;
      const hNorm = val16 / 65535.0;

      this.heightData[i] = hNorm;

      const px = Math.floor(hNorm * 255);
      d[i * 4]     = px;
      d[i * 4 + 1] = px;
      d[i * 4 + 2] = px;
      d[i * 4 + 3] = 255;
    }

    this.ctx2D.putImageData(imgData, 0, 0);
  }

  // Paint onto 2D Heightmap Canvas with Gaussian Radial Stamp
  paintAt(cx, cy) {
    const size = 512;
    const r = this.brushSize;
    const rSq = r * r;

    const minX = Math.max(0, Math.floor(cx - r));
    const maxX = Math.min(size - 1, Math.ceil(cx + r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxY = Math.min(size - 1, Math.ceil(cy + r));

    const imgData = this.ctx2D.getImageData(minX, minY, maxX - minX + 1, maxY - minY + 1);
    const pxData = imgData.data;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;

        if (distSq <= rSq) {
          const idx = y * size + x;
          const falloff = (1.0 - Math.sqrt(distSq) / r);
          const delta = falloff * falloff * this.brushStrength * 0.15;

          if (this.currentTool === 'raise') {
            this.heightData[idx] = Math.min(1.0, this.heightData[idx] + delta);
          } else if (this.currentTool === 'lower') {
            this.heightData[idx] = Math.max(0.0, this.heightData[idx] - delta);
          } else if (this.currentTool === 'smooth') {
            // Local 3x3 box average
            let sum = 0, count = 0;
            for (let sy = Math.max(0, y - 1); sy <= Math.min(size - 1, y + 1); sy++) {
              for (let sx = Math.max(0, x - 1); sx <= Math.min(size - 1, x + 1); sx++) {
                sum += this.heightData[sy * size + sx];
                count++;
              }
            }
            const avg = sum / count;
            this.heightData[idx] += (avg - this.heightData[idx]) * falloff * 0.3;
          }

          const hNorm = this.heightData[idx];
          const pxVal = Math.floor(hNorm * 255);

          const localIdx = ((y - minY) * (maxX - minX + 1) + (x - minX)) * 4;
          pxData[localIdx]     = pxVal;
          pxData[localIdx + 1] = pxVal;
          pxData[localIdx + 2] = pxVal;
          pxData[localIdx + 3] = 255;
        }
      }
    }

    this.ctx2D.putImageData(imgData, minX, minY);
    this.uploadToWebGL();
  }

  invertHeightmap() {
    const size = 512;
    const imgData = this.ctx2D.getImageData(0, 0, size, size);
    const d = imgData.data;

    for (let i = 0; i < size * size; i++) {
      this.heightData[i] = 1.0 - this.heightData[i];
      const px = Math.floor(this.heightData[i] * 255);
      d[i * 4]     = px;
      d[i * 4 + 1] = px;
      d[i * 4 + 2] = px;
      d[i * 4 + 3] = 255;
    }

    this.ctx2D.putImageData(imgData, 0, 0);
    this.uploadToWebGL();
  }

  smoothAllHeightmap() {
    const size = 512;
    const temp = new Float32Array(size * size);

    // Box blur 3x3
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0, count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = Math.min(size - 1, Math.max(0, x + dx));
            const ny = Math.min(size - 1, Math.max(0, y + dy));
            sum += this.heightData[ny * size + nx];
            count++;
          }
        }
        temp[y * size + x] = sum / count;
      }
    }

    this.heightData.set(temp);

    const imgData = this.ctx2D.getImageData(0, 0, size, size);
    const d = imgData.data;

    for (let i = 0; i < size * size; i++) {
      const px = Math.floor(this.heightData[i] * 255);
      d[i * 4]     = px;
      d[i * 4 + 1] = px;
      d[i * 4 + 2] = px;
      d[i * 4 + 3] = 255;
    }

    this.ctx2D.putImageData(imgData, 0, 0);
    this.uploadToWebGL();
  }

  // Upload painted heightmap back to WebGL Texture in real-time
  uploadToWebGL() {
    const gl = this.renderer.gl;
    const size = 512;
    const texData = new Uint8Array(size * size * 4);

    for (let i = 0; i < size * size; i++) {
      const val16 = Math.floor(this.heightData[i] * 65535);
      const rHigh = Math.floor(val16 / 256);
      const gLow  = val16 % 256;

      const idx = i * 4;
      texData[idx]     = rHigh;
      texData[idx + 1] = gLow;
      texData[idx + 2] = 0;
      texData[idx + 3] = 255;
    }

    gl.bindTexture(gl.TEXTURE_2D, this.renderer.heightTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, texData);

    if (this.onUpdate) this.onUpdate();
  }
}
