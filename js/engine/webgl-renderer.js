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
      cameraPos: [0.0, 5.0, -9.5],
      cameraTarget: [0.0, 1.2, 0.0],
      cameraHeight: 5.0,
      cameraDistance: 10.0,
      fov: 60.0,

      seed: 1337,

      sunAzimuth: 45.0,
      sunElevation: 35.0,
      sunColor: [1.0, 0.9, 0.75],
      sunIntensity: 1.2,
      sunSize: 1.0,

      skyColorHorizon: [0.8, 0.45, 0.35],
      skyColorZenith: [0.15, 0.25, 0.55],

      drawDistance: 150.0,
      fogDensity: 0.30,
      fogColor: [0.75, 0.55, 0.45],

      waterLevel: 0.45,
      waterColor: [0.05, 0.35, 0.45],
      waterReflectivity: 0.65,

      terrainScale: 0.8,
      terrainHeight: 4.2,
      octaves: 7,
      meshQuality: 1.2,
      meshSmoothing: 0.5,
      terrainDomainMode: 0,
      terrainStyle: 1, // 0: Rolling, 1: Razor Peaks, 2: Volcano, 3: Canyon, 4: Spires
      steepness: 1.25,
      paletteMode: 0,
      vegetationAmount: 1.0, // 0: bare rock, 1: default coverage, 2: lush green

      showSphere: 1,
      spherePos: [1.2, 2.2, 2.0],
      sphereRadius: 0.8,
      sphereReflectivity: 0.85,

      renderMode: 0,
      scanlineSpeed: 6.0,
      scanlineY: 0.0,

      renderScale: 0.75
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
      'u_sunDir', 'u_sunColor', 'u_sunIntensity', 'u_sunSize',
      'u_skyColorHorizon', 'u_skyColorZenith',
      'u_drawDistance', 'u_fogDensity', 'u_fogColor',
      'u_waterLevel', 'u_waterColor', 'u_waterReflectivity',
      'u_terrainScale', 'u_terrainHeight', 'u_meshQuality', 'u_meshSmoothing', 'u_terrainDomainMode', 'u_paletteMode',
      'u_vegetationAmount',
      'u_showSphere', 'u_spherePos', 'u_sphereRadius', 'u_sphereReflectivity',
      'u_renderMode', 'u_scanlineY', 'u_heightmap'
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
    const texSize = 512;
    const octs = Math.min(8, Math.max(4, Math.floor(this.state.octaves * this.state.meshQuality)));

    const { data, size } = this.fractalGen.generateHeightmapTexture(
      texSize,
      octs,
      2.5,
      this.state.seed,
      this.state.meshSmoothing,
      this.state.terrainStyle,
      this.state.steepness,
      this.state.terrainDomainMode === 1
    );

    if (this.heightTexture) gl.deleteTexture(this.heightTexture);

    this.heightTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.heightTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

    const wrapMode = this.state.terrainDomainMode === 1 ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);
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

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.heightTexture);
    gl.uniform1i(this.uniforms.u_heightmap, 0);

    gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.u_time, (performance.now() - this.startTime) * 0.001);

    gl.uniform3fv(this.uniforms.u_cameraPos, s.cameraPos);
    gl.uniform3fv(this.uniforms.u_cameraTarget, s.cameraTarget);
    gl.uniform1f(this.uniforms.u_fov, s.fov);

    const sunDir = this.updateSunVector();
    gl.uniform3fv(this.uniforms.u_sunDir, sunDir);
    gl.uniform3fv(this.uniforms.u_sunColor, s.sunColor);
    gl.uniform1f(this.uniforms.u_sunIntensity, s.sunIntensity);
    gl.uniform1f(this.uniforms.u_sunSize, s.sunSize);
    gl.uniform3fv(this.uniforms.u_skyColorHorizon, s.skyColorHorizon);
    gl.uniform3fv(this.uniforms.u_skyColorZenith, s.skyColorZenith);

    gl.uniform1f(this.uniforms.u_drawDistance, s.drawDistance);
    gl.uniform1f(this.uniforms.u_fogDensity, s.fogDensity);
    gl.uniform3fv(this.uniforms.u_fogColor, s.fogColor);

    gl.uniform1f(this.uniforms.u_waterLevel, s.waterLevel);
    gl.uniform3fv(this.uniforms.u_waterColor, s.waterColor);
    gl.uniform1f(this.uniforms.u_waterReflectivity, s.waterReflectivity);

    gl.uniform1f(this.uniforms.u_terrainScale, s.terrainScale);
    gl.uniform1f(this.uniforms.u_terrainHeight, s.terrainHeight);
    gl.uniform1f(this.uniforms.u_meshQuality, s.meshQuality);
    gl.uniform1f(this.uniforms.u_meshSmoothing, s.meshSmoothing);
    gl.uniform1i(this.uniforms.u_terrainDomainMode, s.terrainDomainMode);
    gl.uniform1i(this.uniforms.u_paletteMode, s.paletteMode);
    gl.uniform1f(this.uniforms.u_vegetationAmount, s.vegetationAmount);

    gl.uniform1i(this.uniforms.u_showSphere, s.showSphere);
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
