// cube
const positions = new Float32Array([
  -1, -1, -1,  // 0
   1, -1, -1,  // 1
   1,  1, -1,  // 2
  -1,  1, -1,  // 3
  -1, -1,  1,  // 4
   1, -1,  1,  // 5
   1,  1,  1,  // 6
  -1,  1,  1   // 7
]);

const colors = new Float32Array([
  1,0,0,  0,1,0,  0,0,1, 1,1,0, 1,0,1, 0,1,1, 1,1,0, 1,0,1
]);


const indices = new Uint16Array([
  // Front
  4, 5, 6,   4, 6, 7,
  // Back
  1, 0, 3,   1, 3, 2,
  // Top
  3, 7, 6,   3, 6, 2,
  // Bottom
  0, 1, 5,   0, 5, 4,
  // Right
  1, 2, 6,   1, 6, 5,
  // Left
  0, 4, 7,   0, 7, 3,
]);

// --- PYRAMID ---
const pyramidPositions = new Float32Array([
   0.0,  1.0,  0.0,  // 0: Top
  -1.0, -1.0,  1.0,  // 1: Front-left
   1.0, -1.0,  1.0,  // 2: Front-right
   1.0, -1.0, -1.0,  // 3: Back-right
  -1.0, -1.0, -1.0   // 4: Back-left
]);

const pyramidColors = new Float32Array([
  1,1,1,  1,0,0,  0,1,0,  0,0,1,  1,1,0
]);

const pyramidIndices = new Uint16Array([
  0, 1, 2, // Front face
  0, 2, 3, // Right face
  0, 3, 4, // Back face
  0, 4, 1, // Left face
  1, 4, 3, // Base triangle 1
  1, 3, 2  // Base triangle 2
]);

// --- OCTAHEDRON ---
const octahedronPositions = new Float32Array([
   0.0,  1.0,  0.0,  // 0: Top
   0.0, -1.0,  0.0,  // 1: Bottom
   1.0,  0.0,  0.0,  // 2: Right
  -1.0,  0.0,  0.0,  // 3: Left
   0.0,  0.0,  1.0,  // 4: Front
   0.0,  0.0, -1.0   // 5: Back
]);

const octahedronColors = new Float32Array([
  1,1,1,  0.5,0.5,0.5,  1,0,0,  0,1,0,  0,0,1,  1,1,0
]);

const octahedronIndices = new Uint16Array([
  0, 4, 2, // Top-Front-Right
  0, 2, 5, // Top-Right-Back
  0, 5, 3, // Top-Back-Left
  0, 3, 4, // Top-Left-Front
  1, 2, 4, // Bottom-Right-Front
  1, 5, 2, // Bottom-Back-Right
  1, 3, 5, // Bottom-Left-Back
  1, 4, 3  // Bottom-Front-Left
]);