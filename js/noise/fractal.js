/**
 * KPT Bryce 1.0 Procedural Noise & Heightfield Generator
 * Includes Gaussian Heightmap Smoothing Filter (just like original KPT Bryce Terrain Editor).
 */

export class FractalGenerator {
  constructor() {
    this.perm = new Uint8Array(512);
    this.grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
    this.seed(1337);
  }

  seed(seedVal) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seedVal || 1337;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  dot(g, x, y, z) {
    return g[0] * x + g[1] * y + g[2] * z;
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(a, b, t) {
    return (1 - t) * a + t * b;
  }

  noise(x, y, z = 0) {
    let X = Math.floor(x) & 255;
    let Y = Math.floor(y) & 255;
    let Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A  = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B  = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;

    const g000 = this.grad3[this.perm[AA] % 12];
    const g100 = this.grad3[this.perm[BA] % 12];
    const g010 = this.grad3[this.perm[AB] % 12];
    const g110 = this.grad3[this.perm[BB] % 12];
    const g001 = this.grad3[this.perm[AA + 1] % 12];
    const g101 = this.grad3[this.perm[BA + 1] % 12];
    const g011 = this.grad3[this.perm[AB + 1] % 12];
    const g111 = this.grad3[this.perm[BB + 1] % 12];

    return this.lerp(
      this.lerp(
        this.lerp(this.dot(g000, x, y, z), this.dot(g100, x - 1, y, z), u),
        this.lerp(this.dot(g010, x, y - 1, z), this.dot(g110, x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.dot(g001, x, y, z - 1), this.dot(g101, x - 1, y, z - 1), u),
        this.lerp(this.dot(g011, x, y - 1, z - 1), this.dot(g111, x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }

  fBm(x, z, octaves = 6, lacunarity = 2.0, gain = 0.48) {
    let total = 0;
    let frequency = 1.0;
    let amplitude = 1.0;
    let maxVal = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, z * frequency, 0.5) * amplitude;
      maxVal += amplitude;
      frequency *= lacunarity;
      amplitude *= gain;
    }

    return total / maxVal;
  }

  // Gaussian Smoothing Pass (Original KPT Bryce Terrain Smoothing Filter)
  applyGaussianSmoothing(heights, size, passes = 1) {
    const temp = new Float32Array(size * size);
    
    for (let p = 0; p < passes; p++) {
      // Horizontal Pass
      for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
          let sum = 0;
          let weightSum = 0;
          for (let dx = -2; dx <= 2; dx++) {
            const nx = Math.min(size - 1, Math.max(0, x + dx));
            const w = dx === 0 ? 0.4 : (Math.abs(dx) === 1 ? 0.24 : 0.06);
            sum += heights[z * size + nx] * w;
            weightSum += w;
          }
          temp[z * size + x] = sum / weightSum;
        }
      }

      // Vertical Pass
      for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
          let sum = 0;
          let weightSum = 0;
          for (let dz = -2; dz <= 2; dz++) {
            const nz = Math.min(size - 1, Math.max(0, z + dz));
            const w = dz === 0 ? 0.4 : (Math.abs(dz) === 1 ? 0.24 : 0.06);
            sum += temp[nz * size + x] * w;
            weightSum += w;
          }
          heights[z * size + x] = sum / weightSum;
        }
      }
    }
  }

  // Generate 16-bit High-Precision Heightmap Texture with KPT Bryce Gaussian Smoothing
  generateHeightmapTexture(size = 512, octaves = 7, scale = 2.5, seedVal = 1337, smoothingAmount = 1.0) {
    this.seed(seedVal);
    const rawHeights = new Float32Array(size * size);

    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const nx = (x / size - 0.5) * scale;
        const nz = (z / size - 0.5) * scale;
        let h = this.fBm(nx, nz, octaves, 2.0, 0.48);
        rawHeights[z * size + x] = Math.min(1.0, Math.max(0.0, (h + 1.0) * 0.5));
      }
    }

    // Apply Gaussian Smoothing passes based on smoothingAmount (0.0 = sharp, 3.0 = silky smooth)
    const blurPasses = Math.round(smoothingAmount * 2);
    if (blurPasses > 0) {
      this.applyGaussianSmoothing(rawHeights, size, blurPasses);
    }

    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      const h = rawHeights[i];
      const val16 = Math.floor(h * 65535);
      const rHigh = Math.floor(val16 / 256);
      const gLow  = val16 % 256;

      const idx = i * 4;
      data[idx]     = rHigh;
      data[idx + 1] = gLow;
      data[idx + 2] = 0;
      data[idx + 3] = 255;
    }
    return { data, size };
  }
}
