/**
 * Brice3D — Main Entry Point
 * Initializes WebGL2 Raytracer, KPT Tactile UI, Canvas View Controller, and 2D Heightmap Noise Editor.
 */

import { WebGLRenderer } from './engine/webgl-renderer.js';
import { KptUIManager } from './ui/kpt-ui.js';
import { CanvasViewController } from './ui/canvas-view.js';
import { NoiseEditor } from './ui/noise-editor.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('renderCanvas');
  if (!canvas) return;

  const renderer = new WebGLRenderer(canvas);
  const canvasViewController = new CanvasViewController(renderer);
  const uiManager = new KptUIManager(renderer, () => {
    canvasViewController.triggerRender();
  });

  const noiseEditor = new NoiseEditor(renderer, () => {
    canvasViewController.triggerRender();
  });

  const parent = canvas.parentElement;
  if (parent) {
    renderer.resizeCanvas(parent.clientWidth, parent.clientHeight);
    window.addEventListener('resize', () => {
      renderer.resizeCanvas(parent.clientWidth, parent.clientHeight);
      canvasViewController.triggerRender();
    });
  }

  canvasViewController.triggerRender();
});
