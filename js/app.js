/**
 * Brice3D — Main Entry Point
 * Initializes WebGL2 Raytracer, KPT Tactile UI, Canvas View Controller, and 2D Heightmap Noise Editor.
 */

import { WebGLRenderer } from './engine/webgl-renderer.js';
import { KptUIManager } from './ui/kpt-ui.js';
import { CanvasViewController } from './ui/canvas-view.js';
import { NoiseEditor } from './ui/noise-editor.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('renderCanvas');
  if (!canvas) return;

  const renderer = new WebGLRenderer(canvas);
  const canvasController = new CanvasViewController(canvas, renderer);

  const onStateChange = () => {
    // Reset progressive scanline on property change if in scanline mode
    if (renderer.state.renderMode === 1) {
      renderer.resetScanline();
      canvasController.renderStartTime = performance.now();
    }
  };

  const uiManager = new KptUIManager(renderer, onStateChange);
  const noiseEditor = new NoiseEditor(renderer, onStateChange);

  // Start Engine Render Loop with callback for metrics
  renderer.startRenderLoop((percent) => {
    canvasController.updateMetrics(percent);
  });
});
