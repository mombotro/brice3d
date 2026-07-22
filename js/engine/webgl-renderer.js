/**
 * KPT Bryce 1.0 WebGL2 Renderer Manager
 * Handles program compilation, texture bindings, camera transformation, render scaling, and render loop.
 */

import { VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE } from './shader-source.js';
import { FractalGenerator } from '../noise/fractal.js';

export class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });

    if (!this.gl) {
      console.error('WebGL 2 is not supported by your browser.');
      alert('WebGL 2 is required to run the KPT Bryce Raytracer.');
      return;
    }

    this.fractalGen = new FractalGenerator();
    this.program = null;
    this.uniforms = {};
    this.heightTexture = null;
    this.isRendering = false;
    this.startTime = performance.now();

    // Scene State Defaults
    this.state = {
      cameraPos: [0.0, 4.5, -9.0],
      cameraTarget: [0.0, 1.2, 0.0],
      fov: 60.0,

      sunAzimuth: 45.0,
      sunElevation: 35.0,
      sunColor: [1.0, 0.9, 0.75],

      skyColorHorizon: [0.8, 0.45, 0.35],
      skyColorZenith: [0.15, 0.25, 0.55],

      fogDensity: 0.4,
      fogColor: [0.75, 0.55, 0.45],

      waterLevel: 0.6,
      waterColor: [0.05, 0.35, 0.45],
      waterReflectivity: 0.6,

      terrainScale: 0.8,
      terrainHeight: 3.2,
      octaves: 6,
      paletteMode: 0,

      spherePos: [1.2, 1.8, 2.0],
      sphereRadius: 0.8,
      sphereReflectivity: 0.85,

      renderMode: 0, // 0: Real-time 60FPS, 1: Scanline Progressive
      scanlineSpeed: 6.0,
      scanlineY: 0.0,

      renderScale: 0.75 // Performance Render Scale factor (0.5 to 1.0)
    };

    this.initShaders();
    this.initQuad();
    this.initHeightmapTexture();
  }

  initShaders() {
    const gl = this.gl;
    const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Shader Link Error:', gl.getProgramInfoLog(this.program));
      return;
    }

    gl.useProgram(this.program);

    const uniformNames = [
      'u_resolution', 'u_time', 'u_cameraPos', 'u_cameraTarget', 'u_fov',
      'u_sunDir', 'u_sunColor', 'u_skyColorHorizon', 'u_skyColorZenith',
      'u_fogDensity', 'u_fogColor', 'u_waterLevel', 'u_waterColor', 'u_waterReflectivity',
      'u_terrainScale', 'u_terrainHeight', 'u_paletteMode',
      'u_spherePos', 'u_sphereRadius', 'u_sphereReflectivity', 'u_renderMode', 'u_scanlineY',
      'u_heightmap'
    ];

    uniformNames.forEach(name => {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    });
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader Compile Error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  initQuad() {
    const gl = this.gl;
    const positions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0
    ]);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  }

  initHeightmapTexture() {
    const gl = this.gl;
    const { data, size } = this.fractalGen.generateHeightmapTexture(512, this.state.octaves, 2.5);

    if (this.heightTexture) gl.deleteTexture(this.heightTexture);

    this.heightTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.heightTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  regenerateHeightmap() {
    this.initHeightmapTexture();
  }

  resizeCanvas(displayWidth, displayHeight) {
    const scale = this.state.renderScale;
    const w = Math.max(320, Math.floor(displayWidth * scale));
    const h = Math.max(240, Math.floor(displayHeight * scale));

    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    this.state.scanlineY = 0;
  }

  updateSunVector() {
    const azRad = (this.state.sunAzimuth * Math.PI) / 180;
    const elRad = (this.state.sunElevation * Math.PI) / 180;

    const x = Math.cos(elRad) * Math.sin(azRad);
    const y = Math.sin(elRad);
    const z = Math.cos(elRad) * Math.cos(azRad);

    return [x, y, z];
  }

  renderFrame(onProgress) {
    const gl = this.gl;
    const s = this.state;

    gl.useProgram(this.program);

    // Bind Heightmap Texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.heightTexture);
    gl.uniform1i(this.uniforms.u_heightmap, 0);

    // Uniform Updates
    gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.u_time, (performance.now() - this.startTime) * 0.001);

    gl.uniform3fv(this.uniforms.u_cameraPos, s.cameraPos);
    gl.uniform3fv(this.uniforms.u_cameraTarget, s.cameraTarget);
    gl.uniform1f(this.uniforms.u_fov, s.fov);

    const sunDir = this.updateSunVector();
    gl.uniform3fv(this.uniforms.u_sunDir, sunDir);
    gl.uniform3fv(this.uniforms.u_sunColor, s.sunColor);
    gl.uniform3fv(this.uniforms.u_skyColorHorizon, s.skyColorHorizon);
    gl.uniform3fv(this.uniforms.u_skyColorZenith, s.skyColorZenith);

    gl.uniform1f(this.uniforms.u_fogDensity, s.fogDensity);
    gl.uniform3fv(this.uniforms.u_fogColor, s.fogColor);

    gl.uniform1f(this.uniforms.u_waterLevel, s.waterLevel);
    gl.uniform3fv(this.uniforms.u_waterColor, s.waterColor);
    gl.uniform1f(this.uniforms.u_waterReflectivity, s.waterReflectivity);

    gl.uniform1f(this.uniforms.u_terrainScale, s.terrainScale);
    gl.uniform1f(this.uniforms.u_terrainHeight, s.terrainHeight);
    gl.uniform1i(this.uniforms.u_paletteMode, s.paletteMode);

    gl.uniform3fv(this.uniforms.u_spherePos, s.spherePos);
    gl.uniform1f(this.uniforms.u_sphereRadius, s.sphereRadius);
    gl.uniform1f(this.uniforms.u_sphereReflectivity, s.sphereReflectivity);

    gl.uniform1i(this.uniforms.u_renderMode, s.renderMode);

    if (s.renderMode === 1) {
      s.scanlineY += s.scanlineSpeed * (this.canvas.height / 200.0);
      if (s.scanlineY > this.canvas.height) {
        s.scanlineY = this.canvas.height;
      }
      gl.uniform1f(this.uniforms.u_scanlineY, s.scanlineY);

      if (onProgress) {
        const percent = Math.min(100, Math.floor((s.scanlineY / this.canvas.height) * 100));
        onProgress(percent);
      }
    } else {
      gl.uniform1f(this.uniforms.u_scanlineY, this.canvas.height);
      if (onProgress) onProgress(100);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  startRenderLoop(onFrame) {
    this.isRendering = true;
    const loop = () => {
      if (!this.isRendering) return;
      this.renderFrame(onFrame);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stopRenderLoop() {
    this.isRendering = false;
  }

  resetScanline() {
    this.state.scanlineY = 0.0;
  }
}
