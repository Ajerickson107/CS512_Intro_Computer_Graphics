const VERTEX_SHADER = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uModelView;
uniform mat4 uProjection;

out vec3 vPosition;
out vec3 vNormal;

void main() {
  vec4 p = uModelView * vec4(aPosition, 1.0);
  vPosition = p.xyz;
  // Normal matrix handles non-uniform scaling accurately
  mat3 normalMatrix = transpose(inverse(mat3(uModelView)));
  vNormal = normalMatrix * aNormal;
  gl_Position = uProjection * p;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

in vec3 vPosition;
in vec3 vNormal;

uniform vec3 uLightPos1;    // Light 1 in eye space
uniform vec3 uLightColor1;
uniform vec3 uLightPos2;    // Light 2 in eye space
uniform vec3 uLightColor2;

uniform vec3 uColor;
uniform vec3 uMaterial;     // x = Ka, y = Kd, z = Ks
uniform float uShininess;
uniform int uFlatShading;   // 1 = flat derivative normal, 0 = smooth interpolated normal
uniform int uEmissive;      // 1 = unlit glowing light indicator
uniform int uRimEnable;     // 1 = Fresnel rim highlight

out vec4 fragColor;

vec3 calcPointLight(vec3 lightPos, vec3 lightColor, vec3 N, vec3 V, vec3 baseColor) {
  vec3 L = normalize(lightPos - vPosition);
  vec3 R = reflect(-L, N);

  float diff = max(dot(N, L), 0.0);
  float spec = (uMaterial.z > 0.001 && diff > 0.0)
    ? pow(max(dot(V, R), 0.0), uShininess)
    : 0.0;

  vec3 diffuse  = uMaterial.y * baseColor * diff * lightColor;
  vec3 specular = uMaterial.z * vec3(1.0) * spec * lightColor;
  return diffuse + specular;
}

void main() {
  if (uEmissive == 1) {
    fragColor = vec4(uColor, 1.0);
    return;
  }

  // Choose between Flat Shading (per-face derivative normal) and Smooth Shading
  vec3 N;
  if (uFlatShading == 1) {
    N = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
  } else {
    N = normalize(vNormal);
  }

  vec3 V = normalize(-vPosition); // Camera is at origin in eye space
  vec3 ambient = uMaterial.x * uColor;

  vec3 color = ambient
             + calcPointLight(uLightPos1, uLightColor1, N, V, uColor)
             + calcPointLight(uLightPos2, uLightColor2, N, V, uColor);

  // Extra effect: subtle Fresnel rim lighting
  if (uRimEnable == 1) {
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.5);
    color += 0.18 * rim * (uLightColor1 + uLightColor2);
  }

  fragColor = vec4(color, 1.0);
}
`;

// WebGL setup
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl2");

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

// Fixed attribute slots so meshes remain valid when shaders are live-edited
const ATTRIBUTES = { aPosition: 0, aNormal: 1 };

function createProgram(vsSource, fsSource) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
  for (const name in ATTRIBUTES) gl.bindAttribLocation(prog, ATTRIBUTES[name], name);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  return prog;
}

// Shader editors
const vertEditor = document.getElementById("vertEditor");
const fragEditor = document.getElementById("fragEditor");
const shaderError = document.getElementById("shaderError");
vertEditor.value = VERTEX_SHADER;
fragEditor.value = FRAGMENT_SHADER;

let program, uModelView, uProjection;
let uLightPos1, uLightColor1, uLightPos2, uLightColor2;
let uColor, uMaterial, uShininess, uFlatShading, uEmissive, uRimEnable;

function updateProgram() {
  try {
    const prog = createProgram(vertEditor.value, fragEditor.value);
    if (program) gl.deleteProgram(program);
    program = prog;
    gl.useProgram(program);
    uModelView   = gl.getUniformLocation(program, "uModelView");
    uProjection  = gl.getUniformLocation(program, "uProjection");
    uLightPos1   = gl.getUniformLocation(program, "uLightPos1");
    uLightColor1 = gl.getUniformLocation(program, "uLightColor1");
    uLightPos2   = gl.getUniformLocation(program, "uLightPos2");
    uLightColor2 = gl.getUniformLocation(program, "uLightColor2");
    uColor       = gl.getUniformLocation(program, "uColor");
    uMaterial    = gl.getUniformLocation(program, "uMaterial");
    uShininess   = gl.getUniformLocation(program, "uShininess");
    uFlatShading = gl.getUniformLocation(program, "uFlatShading");
    uEmissive    = gl.getUniformLocation(program, "uEmissive");
    uRimEnable   = gl.getUniformLocation(program, "uRimEnable");
    shaderError.textContent = "";
  } catch (e) {
    shaderError.textContent = e.message.replace(/\0/g, "");
  }
}
updateProgram();
vertEditor.addEventListener("input", updateProgram);
fragEditor.addEventListener("input", updateProgram);

function bindAttribute(name, data) {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.vertexAttribPointer(ATTRIBUTES[name], 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(ATTRIBUTES[name]);
}

function createMesh({ positions, normals, indices }) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  bindAttribute("aPosition", positions);
  bindAttribute("aNormal", normals);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  return { vao, count: indices.length };
}

// Create 5 distinct geometric primitives (including smooth & flat-shaded sphere copies)
const cubeMesh       = createMesh(createCube());
const cylinderMesh   = createMesh(createCylinder(36));
const coneMesh       = createMesh(createCone(28));
const torusMesh      = createMesh(createTorus(0.7, 0.25, 32, 18));
const smoothSphere   = createMesh(createSphere(14, 20));
const flatSphere     = createMesh(toFlatShaded(createSphere(12, 16)));

gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.05, 0.05, 0.08, 1);
const projection = perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

// Helper to convert hex color input (#rrggbb) to [r, g, b] in [0..1]
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Interactive state
let dragRotX = 0.2, dragRotY = -0.4;
let camX = 0, camY = -0.3, camZ = -7.5;
let sliderAngle = 0;
let spinning = false, spinAngle = 0;
let autoWave = true, waveTime = 0;

let mouseDown = false, lastX, lastY;
canvas.addEventListener("mousedown", e => { mouseDown = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener("mouseup", () => mouseDown = false);
window.addEventListener("mousemove", e => {
  if (!mouseDown) return;
  dragRotY += (e.clientX - lastX) * 0.01;
  dragRotX += (e.clientY - lastY) * 0.01;
  lastX = e.clientX; lastY = e.clientY;
});

document.addEventListener("keydown", e => {
  if (e.target === vertEditor || e.target === fragEditor) return;
  const step = 0.2;
  switch (e.key) {
    case "ArrowUp": camY -= step; break;
    case "ArrowDown": camY += step; break;
    case "ArrowLeft": camX += step; break;
    case "ArrowRight": camX -= step; break;
    case "w": camZ += step; break;
    case "s": camZ -= step; break;
    default: return;
  }
  e.preventDefault();
});

const axisSelect = document.getElementById("axisSelect");
document.getElementById("slider").addEventListener("input", e => {
  sliderAngle = Number(e.target.value);
  document.getElementById("sliderValue").textContent = sliderAngle;
});
document.getElementById("spinButton").addEventListener("click", () => spinning = !spinning);
document.getElementById("animButton").addEventListener("click", e => {
  autoWave = !autoWave;
  e.target.textContent = autoWave ? "Pause Wave" : "Resume Wave";
});

// Bind joint & material slider readouts
function bindRange(id, labelId, suffix = "") {
  const el = document.getElementById(id);
  const label = document.getElementById(labelId);
  if (label) el.addEventListener("input", () => label.textContent = el.value + suffix);
  return el;
}

const baseYawEl    = bindRange("baseYaw", "baseYawVal", "°");
const lowerPitchEl = bindRange("lowerPitch", "lowerPitchVal", "°");
const upperPitchEl = bindRange("upperPitch", "upperPitchVal", "°");
const wristRollEl  = bindRange("wristRoll", "wristRollVal", "°");
const clawSpreadEl = bindRange("clawSpread", "clawSpreadVal", "°");

const seg1KdEl    = bindRange("seg1Kd", "seg1KdVal");
const seg1KsEl    = bindRange("seg1Ks", "seg1KsVal");
const seg1ShineEl = bindRange("seg1Shine", "seg1ShineVal");
const seg1ColorEl = document.getElementById("seg1Color");
const seg1FlatEl  = document.getElementById("seg1Flat");

const seg2KdEl    = bindRange("seg2Kd", "seg2KdVal");
const seg2KsEl    = bindRange("seg2Ks", "seg2KsVal");
const seg2ShineEl = bindRange("seg2Shine", "seg2ShineVal");
const seg2ColorEl = document.getElementById("seg2Color");
const seg2FlatEl  = document.getElementById("seg2Flat");

// Scene Graph Node constructor with per-node material properties
function createNode(mesh, color, shape, material = [0.2, 0.8, 0.5], shininess = 32, flat = 0) {
  return { mesh, color, shape, material, shininess, flat, joint: translate(0, 0, 0), children: [] };
}

// ============================================================================
// 5-LEVEL HIERARCHICAL MODEL WITH 5 DISTINCT PRIMITIVES
// ============================================================================

// Level 1 (Root): Rotating Turret Base (Cylinder - Metallic High Specular)
const turretBase = createNode(
  cylinderMesh,
  [0.75, 0.78, 0.85],
  multiply(translate(0, 0.25, 0), scale(0.95, 0.25, 0.95)),
  [0.2, 0.5, 1.0], 96, 0
);

// Level 2: Lower Arm (Cube - Pure Diffuse / Matte by default, Ks = 0.0)
const lowerArm = createNode(
  cubeMesh,
  [0.9, 0.22, 0.27],
  multiply(translate(0, 0.65, 0), scale(0.26, 0.65, 0.26)),
  [0.2, 0.9, 0.0], 16, 0
);

// Level 3: Upper Forearm (Cone - Combined Diffuse + Specular)
const upperForearm = createNode(
  coneMesh,
  [0.23, 0.53, 1.0],
  multiply(translate(0, 0.55, 0), scale(0.24, 0.55, 0.24)),
  [0.2, 0.75, 0.95], 64, 0
);

// Level 4: Wrist Yoke (Torus - Gold Specular Collar)
const wristTorus = createNode(
  torusMesh,
  [0.95, 0.78, 0.2],
  scale(0.45, 0.45, 0.45),
  [0.22, 0.65, 1.0], 80, 0
);

// Level 5a: Left Inspection Orb (Smooth-Shaded Sphere)
const leftSmoothOrb = createNode(
  smoothSphere,
  [0.2, 0.9, 0.55],
  scale(0.36, 0.36, 0.36),
  [0.2, 0.75, 0.95], 64, 0
);

// Level 5b: Right Inspection Orb (Flat-Shaded Copy of Sphere for Side-by-Side Comparison)
const rightFlatOrb = createNode(
  flatSphere,
  [0.2, 0.9, 0.55],
  scale(0.36, 0.36, 0.36),
  [0.2, 0.75, 0.95], 64, 1
);

// Level 5c & 5d: Articulated Upper Gripper Claws (Cones)
const leftClaw = createNode(
  coneMesh,
  [0.9, 0.5, 0.15],
  multiply(translate(0, 0.3, 0), scale(0.09, 0.3, 0.09)),
  [0.2, 0.8, 0.6], 32, 0
);
const rightClaw = createNode(
  coneMesh,
  [0.9, 0.5, 0.15],
  multiply(translate(0, 0.3, 0), scale(0.09, 0.3, 0.09)),
  [0.2, 0.8, 0.6], 32, 1
);

// Assemble 5-Level Hierarchy:
// Level 1 (turretBase) -> Level 2 (lowerArm) -> Level 3 (upperForearm) -> Level 4 (wristTorus) -> Level 5 (Orbs & Claws)
turretBase.children.push(lowerArm);
lowerArm.children.push(upperForearm);
upperForearm.children.push(wristTorus);
wristTorus.children.push(leftSmoothOrb, rightFlatOrb, leftClaw, rightClaw);

function drawNode(node, frame) {
  gl.uniformMatrix4fv(uModelView, false, multiply(frame, node.shape));
  gl.uniform3fv(uColor, node.color);
  gl.uniform3fv(uMaterial, node.material);
  gl.uniform1f(uShininess, node.shininess);
  gl.uniform1i(uFlatShading, node.flat);
  gl.uniform1i(uEmissive, 0);
  gl.bindVertexArray(node.mesh.vao);
  gl.drawElements(gl.TRIANGLES, node.mesh.count, gl.UNSIGNED_SHORT, 0);
}

function drawTree(root, rootFrame) {
  const stack = [[root, rootFrame]];
  while (stack.length > 0) {
    const [node, parentFrame] = stack.pop();
    const frame = multiply(parentFrame, node.joint);
    drawNode(node, frame);
    for (const child of node.children) stack.push([child, frame]);
  }
}

// Draw small glowing spheres at each point light's world position
function drawLightIndicator(view, worldPos, color) {
  const m = multiply(view, multiply(translate(worldPos[0], worldPos[1], worldPos[2]), scale(0.12, 0.12, 0.12)));
  gl.uniformMatrix4fv(uModelView, false, m);
  gl.uniform3fv(uColor, color);
  gl.uniform1i(uEmissive, 1);
  gl.bindVertexArray(smoothSphere.vao);
  gl.drawElements(gl.TRIANGLES, smoothSphere.count, gl.UNSIGNED_SHORT, 0);
}

// Render loop
let lastTime = 0;
function render(time) {
  const t = time / 1000;
  const dt = t - lastTime;
  lastTime = t;

  if (spinning) spinAngle += dt;
  if (autoWave) waveTime += dt;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const view = translate(camX, camY, camZ);
  gl.uniformMatrix4fv(uProjection, false, projection);
  gl.uniform1i(uRimEnable, document.getElementById("rimToggle").checked ? 1 : 0);

  // Compute Light 1 & Light 2 positions and colors
  const orbit = document.getElementById("orbitLights").checked ? waveTime * 0.9 : 0;
  const l1BaseX = Number(document.getElementById("l1X").value);
  const l1BaseY = Number(document.getElementById("l1Y").value);
  const l1World = [
    l1BaseX * Math.cos(orbit) - 4.0 * Math.sin(orbit),
    l1BaseY,
    l1BaseX * Math.sin(orbit) + 4.0 * Math.cos(orbit)
  ];
  const l1Int = Number(document.getElementById("l1Intensity").value);
  const l1Col = hexToRgb(document.getElementById("l1Color").value).map(c => c * l1Int);

  const l2BaseX = Number(document.getElementById("l2X").value);
  const l2BaseY = Number(document.getElementById("l2Y").value);
  const l2World = [
    l2BaseX * Math.cos(-orbit * 0.7) - 3.0 * Math.sin(-orbit * 0.7),
    l2BaseY,
    l2BaseX * Math.sin(-orbit * 0.7) + 3.0 * Math.cos(-orbit * 0.7)
  ];
  const l2Int = Number(document.getElementById("l2Intensity").value);
  const l2Col = hexToRgb(document.getElementById("l2Color").value).map(c => c * l2Int);

  gl.uniform3fv(uLightPos1, transformPoint(view, l1World));
  gl.uniform3fv(uLightColor1, l1Col);
  gl.uniform3fv(uLightPos2, transformPoint(view, l2World));
  gl.uniform3fv(uLightColor2, l2Col);

  // Update interactive materials from UI controls
  const s1Color = hexToRgb(seg1ColorEl.value);
  lowerArm.color     = s1Color;
  lowerArm.material  = [0.2, Number(seg1KdEl.value), Number(seg1KsEl.value)];
  lowerArm.shininess = Number(seg1ShineEl.value);
  lowerArm.flat      = seg1FlatEl.checked ? 1 : 0;

  const s2Color = hexToRgb(seg2ColorEl.value);
  const s2Mat   = [0.2, Number(seg2KdEl.value), Number(seg2KsEl.value)];
  const s2Shine = Number(seg2ShineEl.value);
  const forceFlat = seg2FlatEl.checked ? 1 : 0;

  upperForearm.color     = s2Color;
  upperForearm.material  = s2Mat;
  upperForearm.shininess = s2Shine;
  upperForearm.flat      = forceFlat;

  // Keep twin spheres matching Segment B's material so the only difference between them is Smooth vs. Flat shading
  leftSmoothOrb.material  = s2Mat;
  leftSmoothOrb.shininess = s2Shine;
  leftSmoothOrb.flat      = forceFlat;

  rightFlatOrb.material   = s2Mat;
  rightFlatOrb.shininess  = s2Shine;
  rightFlatOrb.flat       = 1; // Always flat-shaded for comparison

  // Whole-model rotation
  const axisRotation = ROTATE[axisSelect.value](sliderAngle * Math.PI / 180 + spinAngle);
  const globalRot = multiply(multiply(rotateY(dragRotY), rotateX(dragRotX)), axisRotation);

  // Joint angles (combining manual UI sliders + optional gentle wave animation)
  const deg = Math.PI / 180;
  const baseYaw    = Number(baseYawEl.value) * deg + (autoWave ? 0.35 * Math.sin(waveTime * 0.8) : 0);
  const lowerPitch = Number(lowerPitchEl.value) * deg + (autoWave ? 0.3 * Math.sin(waveTime * 1.2) : 0);
  const upperPitch = Number(upperPitchEl.value) * deg + (autoWave ? 0.45 * Math.sin(waveTime * 1.6) : 0);
  const wristRoll  = Number(wristRollEl.value) * deg + (autoWave ? 0.8 * waveTime : 0);
  const clawSpread = Number(clawSpreadEl.value) * deg + (autoWave ? 0.18 * Math.sin(waveTime * 2.5) : 0);

  // Level 1: Turret Base (Root)
  turretBase.joint = multiply(multiply(translate(0, -1.8, 0), globalRot), rotateY(baseYaw));

  // Level 2: Lower Arm
  lowerArm.joint = multiply(translate(0, 0.5, 0), rotateZ(lowerPitch));

  // Level 3: Upper Forearm
  upperForearm.joint = multiply(translate(0, 1.3, 0), rotateZ(upperPitch));

  // Level 4: Wrist Torus
  wristTorus.joint = multiply(translate(0, 1.25, 0), rotateY(wristRoll));

  // Level 5: Twin Inspection Spheres (Smooth Left vs. Flat Right) + Articulated Claws
  leftSmoothOrb.joint = multiply(translate(-0.62, 0.0, 0), rotateY(waveTime));
  rightFlatOrb.joint  = multiply(translate(0.62, 0.0, 0), rotateY(waveTime));
  leftClaw.joint      = multiply(translate(-0.22, 0.2, 0), rotateZ(clawSpread));
  rightClaw.joint     = multiply(translate(0.22, 0.2, 0), rotateZ(-clawSpread));

  // Render hierarchical model and glowing light indicators
  drawTree(turretBase, view);
  drawLightIndicator(view, l1World, l1Col);
  drawLightIndicator(view, l2World, l2Col);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);