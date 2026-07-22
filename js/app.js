/**
 * KPT Bryce 1.0 Main Application Controller
 */

import { WebGLRenderer } from './engine/webgl-renderer.js';
import { KptUIManager } from './ui/kpt-ui.js';
import { CanvasViewController } from './ui/canvas-view.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('renderCanvas');
  if (!canvas) return;

  const renderer = new WebGLRenderer(canvas);
  
  const canvasController = new CanvasViewController(canvas, renderer);

  const uiManager = new KptUIManager(renderer, () => {
    // Reset progressive scanline on property change if in scanline mode
    if (renderer.state.renderMode === 1) {
      renderer.resetScanline();
      canvasController.renderStartTime = performance.now();
    }
  });

  // Start Engine Render Loop with callback for metrics
  renderer.startRenderLoop((percent) => {
    canvasController.updateMetrics(percent);
  });
});
