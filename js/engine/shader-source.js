/**
 * KPT Bryce 1.0 WebGL2 Raymarching & Heightfield GLSL Shader Suite
 * Ultra-Optimized Texture-Backed Raymarching Engine with Custom Atmosphere & Sun Controls.
 */

export const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 a_position;
out vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_heightmap;

// Camera Uniforms
uniform vec3 u_cameraPos;
uniform vec3 u_cameraTarget;
uniform float u_fov;

// Lighting & Sun Uniforms
uniform vec3 u_sunDir;
uniform vec3 u_sunColor;
uniform float u_sunIntensity;
uniform float u_sunSize;
uniform vec3 u_skyColorHorizon;
uniform vec3 u_skyColorZenith;

// Atmosphere & Water Uniforms
uniform float u_fogDensity;
uniform vec3 u_fogColor;
uniform float u_waterLevel;
uniform vec3 u_waterColor;
uniform float u_waterReflectivity;

// Terrain Uniforms
uniform float u_terrainScale;
uniform float u_terrainHeight;
uniform int u_paletteMode;

// Sphere Primitive Uniforms
uniform int u_showSphere;
uniform vec3 u_spherePos;
uniform float u_sphereRadius;
uniform float u_sphereReflectivity;

// Rendering Mode
uniform int u_renderMode;
uniform float u_scanlineY;

float getTerrainHeight(vec2 p) {
    vec2 uv = p * 0.04 * u_terrainScale + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
    return texture(u_heightmap, uv).r * u_terrainHeight;
}

vec3 getTerrainNormal(vec2 p) {
    float eps = 0.04;
    float h = getTerrainHeight(p);
    float hx = getTerrainHeight(p + vec2(eps, 0.0));
    float hz = getTerrainHeight(p + vec2(0.0, eps));
    return normalize(vec3(h - hx, eps, h - hz));
}

bool raycastTerrain(vec3 ro, vec3 rd, int maxSteps, out float hitT, out vec3 hitNormal) {
    float t = 0.5;
    float tMax = 80.0;

    for (int i = 0; i < 110; i++) {
        if (i >= maxSteps) break;
        vec3 p = ro + rd * t;
        float h = getTerrainHeight(p.xz);

        if (p.y <= h) {
            float t0 = t - max(0.08, t * 0.025);
            float t1 = t;
            for (int j = 0; j < 4; j++) {
                float tm = (t0 + t1) * 0.5;
                vec3 pm = ro + rd * tm;
                if (pm.y <= getTerrainHeight(pm.xz)) {
                    t1 = tm;
                } else {
                    t0 = tm;
                }
            }
            hitT = t1;
            hitNormal = getTerrainNormal((ro + rd * hitT).xz);
            return true;
        }

        float diff = max(0.1, p.y - h);
        t += max(0.08, diff * 0.35 + t * 0.015);
        if (t > tMax) break;
    }
    return false;
}

bool raycastSphere(vec3 ro, vec3 rd, vec3 center, float radius, out float tHit, out vec3 norm) {
    if (u_showSphere == 0) return false;
    vec3 oc = ro - center;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - radius * radius;
    float h = b * b - c;
    if (h < 0.0) return false;
    h = sqrt(h);
    float t = -b - h;
    if (t < 0.0) t = -b + h;
    if (t < 0.0) return false;
    tHit = t;
    norm = normalize((ro + rd * t) - center);
    return true;
}

vec3 getTerrainColor(vec3 pos, vec3 normal) {
    float height = pos.y;
    float slope = dot(normal, vec3(0.0, 1.0, 0.0));

    vec3 rock, grass, snow, sand;

    if (u_paletteMode == 0) { // Alpine
        rock = vec3(0.35, 0.30, 0.28);
        grass = vec3(0.20, 0.45, 0.15);
        snow = vec3(0.95, 0.98, 1.00);
        sand = vec3(0.70, 0.65, 0.45);
    } else if (u_paletteMode == 1) { // Emerald Island
        rock = vec3(0.20, 0.30, 0.25);
        grass = vec3(0.05, 0.60, 0.30);
        snow = vec3(0.85, 0.95, 0.90);
        sand = vec3(0.85, 0.80, 0.55);
    } else if (u_paletteMode == 2) { // Alien Purple
        rock = vec3(0.25, 0.10, 0.30);
        grass = vec3(0.60, 0.10, 0.50);
        snow = vec3(0.00, 0.80, 0.95);
        sand = vec3(0.40, 0.15, 0.45);
    } else { // Golden Canyon
        rock = vec3(0.70, 0.35, 0.15);
        grass = vec3(0.85, 0.55, 0.20);
        snow = vec3(1.00, 0.85, 0.60);
        sand = vec3(0.90, 0.70, 0.35);
    }

    vec3 col = grass;

    if (height < u_waterLevel + 0.1) {
        col = sand;
    } else {
        if (slope < 0.68) {
            col = rock;
        } else if (height > u_terrainHeight * 0.5) {
            float snowFactor = smoothstep(u_terrainHeight * 0.5, u_terrainHeight * 0.75, height);
            col = mix(rock, snow, snowFactor);
        }
    }
    return col;
}

vec3 renderSky(vec3 rd) {
    float sunDot = max(dot(rd, u_sunDir), 0.0);
    float skyHeight = max(rd.y, 0.0);

    vec3 sky = mix(u_skyColorHorizon, u_skyColorZenith, pow(skyHeight, 0.6));
    
    float discThreshold = 1.0 - (0.003 * u_sunSize);
    float sunDisc = smoothstep(discThreshold - 0.001, discThreshold, sunDot);
    float sunGlow = pow(sunDot, 16.0 / u_sunSize) * 0.8 + pow(sunDot, 64.0 / u_sunSize) * 1.5;
    
    return sky + u_sunColor * u_sunIntensity * (sunDisc * 3.0 + sunGlow);
}

void main() {
    vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

    if (u_renderMode == 1) {
        if (gl_FragCoord.y > u_scanlineY) {
            fragColor = vec4(0.05, 0.06, 0.08, 1.0);
            return;
        }
    }

    vec3 ww = normalize(u_cameraTarget - u_cameraPos);
    vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
    vec3 vv = cross(uu, ww);

    vec3 rd = normalize(st.x * uu + st.y * vv + (1.0 / tan(u_fov * 0.5 * 3.14159 / 180.0)) * ww);
    vec3 ro = u_cameraPos;

    vec3 finalColor = vec3(0.0);
    float rayDist = 1000.0;

    float tTerrain = -1.0, tSphere = -1.0, tWater = -1.0;
    vec3 nTerrain, nSphere;

    bool hitTerrain = raycastTerrain(ro, rd, 100, tTerrain, nTerrain);
    bool hitSphere = raycastSphere(ro, rd, u_spherePos, u_sphereRadius, tSphere, nSphere);

    if (rd.y < 0.0) {
        float tw = (u_waterLevel - ro.y) / rd.y;
        if (tw > 0.0) tWater = tw;
    }

    int closestObject = 0;
    float closestT = 10000.0;

    if (hitTerrain && tTerrain < closestT) {
        closestT = tTerrain;
        closestObject = 1;
    }
    if (hitSphere && tSphere < closestT) {
        closestT = tSphere;
        closestObject = 3;
    }
    if (tWater > 0.0 && tWater < closestT) {
        closestT = tWater;
        closestObject = 2;
    }

    if (closestObject == 0) {
        finalColor = renderSky(rd);
    } else if (closestObject == 1) {
        vec3 pos = ro + rd * closestT;
        vec3 albedo = getTerrainColor(pos, nTerrain);
        float diff = max(dot(nTerrain, u_sunDir), 0.15);
        finalColor = albedo * (u_sunColor * u_sunIntensity * diff + vec3(0.2, 0.25, 0.3));
        rayDist = closestT;
    } else if (closestObject == 2) {
        vec3 pos = ro + rd * tWater;
        vec3 waveNormal = vec3(0.0, 1.0, 0.0);
        vec3 reflDir = reflect(rd, waveNormal);
        vec3 reflColor = renderSky(reflDir);

        float tReflTerrain; vec3 nReflTerrain;
        if (raycastTerrain(pos + waveNormal * 0.05, reflDir, 40, tReflTerrain, nReflTerrain)) {
            vec3 rPos = pos + reflDir * tReflTerrain;
            reflColor = mix(reflColor, getTerrainColor(rPos, nReflTerrain), 0.7);
        }

        float fresnel = pow(1.0 - max(dot(-rd, waveNormal), 0.0), 3.0);
        finalColor = mix(u_waterColor * 0.4, reflColor, clamp(fresnel + u_waterReflectivity, 0.2, 0.95));
        rayDist = tWater;
    } else if (closestObject == 3) {
        vec3 pos = ro + rd * tSphere;
        vec3 reflDir = reflect(rd, nSphere);
        vec3 reflColor = renderSky(reflDir);

        float tReflTerrain; vec3 nReflTerrain;
        if (raycastTerrain(pos + nSphere * 0.05, reflDir, 40, tReflTerrain, nReflTerrain)) {
            vec3 rPos = pos + reflDir * tReflTerrain;
            reflColor = getTerrainColor(rPos, nReflTerrain);
        }

        float diff = max(dot(nSphere, u_sunDir), 0.05);
        float spec = pow(max(dot(reflDir, u_sunDir), 0.0), 32.0);

        vec3 baseCol = vec3(0.9, 0.92, 0.95);
        finalColor = mix(baseCol * diff * u_sunColor * u_sunIntensity, reflColor, u_sphereReflectivity) + u_sunColor * u_sunIntensity * spec;
        rayDist = tSphere;
    }

    if (closestObject != 0) {
        float fogFactor = 1.0 - exp(-rayDist * u_fogDensity * 0.035);
        finalColor = mix(finalColor, u_fogColor, clamp(fogFactor, 0.0, 0.95));
    }

    finalColor = vec3(1.0) - exp(-finalColor * 1.2);
    finalColor = pow(finalColor, vec3(0.95));

    fragColor = vec4(finalColor, 1.0);
}
`;
