/**
 * KPT Bryce 1.0 Canvas View & Export Controller
 * Manages canvas resolution, real-time vs scanline render modes, FPS calculation, and PNG export.
 */

export class CanvasViewController {
  constructor(canvas, renderer) {
    this.canvas = canvas;
    this.renderer = renderer;

    this.fpsElem = document.getElementById('hudFps');
    this.renderTimeElem = document.getElementById('hudRenderTime');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');

    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.renderStartTime = 0;

    this.initModeToggles();
    this.initExportButton();
    this.initResizeObserver();
  }

  initModeToggles() {
    const btnRealtime = document.getElementById('btnRealtime');
    const btnProgressive = document.getElementById('btnProgressive');
    const btnRerender = document.getElementById('btnRerender');

    if (btnRealtime && btnProgressive) {
      btnRealtime.addEventListener('click', () => {
        this.renderer.state.renderMode = 0;
        btnRealtime.classList.add('active');
        btnProgressive.classList.remove('active');
        if (this.progressText) this.progressText.textContent = 'MODE: REAL-TIME (60 FPS)';
        if (this.progressFill) this.progressFill.style.width = '100%';
      });

      btnProgressive.addEventListener('click', () => {
        this.renderer.state.renderMode = 1;
        this.renderer.resetScanline();
        btnProgressive.classList.add('active');
        btnRealtime.classList.remove('active');
        this.renderStartTime = performance.now();
      });
    }

    if (btnRerender) {
      btnRerender.addEventListener('click', () => {
        this.renderer.resetScanline();
        this.renderStartTime = performance.now();
      });
    }
  }

  initExportButton() {
    const btnExport = document.getElementById('btnExport');
    if (!btnExport) return;

    btnExport.addEventListener('click', () => {
      const dataUrl = this.canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `kpt-bryce-render-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    });
  }

  initResizeObserver() {
    const wrapper = this.canvas.parentElement;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (w > 0 && h > 0) {
          this.renderer.resizeCanvas(w, h);
        }
      }
    });
    observer.observe(wrapper);
  }

  updateMetrics(progressPercent) {
    this.frameCount++;
    const now = performance.now();
    
    // FPS Counter
    if (now - this.lastFpsTime >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      if (this.fpsElem) this.fpsElem.textContent = `${fps} FPS`;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    // Render Progress / Timer
    if (this.renderer.state.renderMode === 1) {
      if (this.progressFill) this.progressFill.style.width = `${progressPercent}%`;
      const elapsed = ((now - this.renderStartTime) * 0.001).toFixed(1);
      
      if (progressPercent < 100) {
        if (this.progressText) this.progressText.textContent = `SCANLINE RENDER: ${progressPercent}% (${elapsed}s)`;
        if (this.renderTimeElem) this.renderTimeElem.textContent = `${elapsed}s`;
      } else {
        if (this.progressText) this.progressText.textContent = `RENDER COMPLETE (${elapsed}s)`;
        if (this.renderTimeElem) this.renderTimeElem.textContent = `${elapsed}s`;
      }
    } else {
      if (this.renderTimeElem) this.renderTimeElem.textContent = '0.0s';
    }
  }
}
