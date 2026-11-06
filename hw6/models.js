function createCube() {
  const positions = new Float32Array([
    -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
     1, -1, -1,  -1, -1, -1,  -1,  1, -1,   1,  1, -1,
    -1,  1,  1,   1,  1,  1,   1,  1, -1,  -1,  1, -1,
    -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
     1, -1,  1,   1, -1, -1,   1,  1, -1,   1,  1,  1,
    -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1
  ]);
  const faceNormals = [[0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]];
  const normals = new Float32Array(faceNormals.flatMap(n => [...n, ...n, ...n, ...n]));
  const faceTangents = [[1, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1]];
  const tangents = new Float32Array(faceTangents.flatMap(t => [...t, ...t, ...t, ...t]));
  const texCoords = new Float32Array(faceNormals.flatMap(() => [0, 0, 1, 0, 1, 1, 0, 1]));
  const indices = new Uint16Array([
     0,  1,  2,   0,  2,  3,
     4,  5,  6,   4,  6,  7,
     8,  9, 10,   8, 10, 11,
    12, 13, 14,  12, 14, 15,
    16, 17, 18,  16, 18, 19,
    20, 21, 22,  20, 22, 23
  ]);
  return { positions, normals, tangents, texCoords, indices };
}

function createCylinder(segments = 64, uRepeat = 3) {
  const positions = [], normals = [], tangents = [], texCoords = [], indices = [];

  for (let i = 0; i <= segments; i++) {
    const u = i / segments, theta = 2 * Math.PI * u;
    const s = Math.sin(theta), c = Math.cos(theta);
    for (const y of [-1, 1]) {
      positions.push(s, y, c);
      normals.push(s, 0, c);
      tangents.push(c, 0, -s);
      texCoords.push(u * uRepeat, (y + 1) / 2);
    }
  }
  for (let i = 0; i < segments; i++) {
    const k = 2 * i;
    indices.push(k, k + 2, k + 3, k, k + 3, k + 1);
  }

  for (const y of [1, -1]) {
    const center = positions.length / 3;
    positions.push(0, y, 0);
    normals.push(0, y, 0);
    tangents.push(1, 0, 0);
    texCoords.push(0.5, 0.5);
    for (let i = 0; i <= segments; i++) {
      const theta = 2 * Math.PI * i / segments;
      const s = Math.sin(theta), c = Math.cos(theta);
      positions.push(s, y, c);
      normals.push(0, y, 0);
      tangents.push(1, 0, 0);
      texCoords.push(0.5 + 0.5 * s, 0.5 - 0.5 * y * c);
    }
    for (let i = 0; i < segments; i++) {
      const a = center + 1 + i, b = a + 1;
      if (y > 0) indices.push(center, a, b);
      else indices.push(center, b, a);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    tangents: new Float32Array(tangents),
    texCoords: new Float32Array(texCoords),
    indices: new Uint16Array(indices)
  };
}

function createSphere(latBands = 32, lonBands = 32) {
  const positions = [], normals = [], tangents = [], texCoords = [], indices = [];

  for (let lat = 0; lat <= latBands; lat++) {
    const v = lat / latBands;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let lon = 0; lon <= lonBands; lon++) {
      const u = lon / lonBands;
      const theta = u * 2 * Math.PI;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      const x = sinTheta * sinPhi;
      const y = -cosPhi;
      const z = cosTheta * sinPhi;

      positions.push(x, y, z);
      normals.push(x, y, z);
      tangents.push(cosTheta, 0, -sinTheta);
      texCoords.push(u, v);
    }
  }

  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const first = lat * (lonBands + 1) + lon;
      const second = first + lonBands + 1;
      indices.push(first, first + 1, second + 1);
      indices.push(first, second + 1, second);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    tangents: new Float32Array(tangents),
    texCoords: new Float32Array(texCoords),
    indices: new Uint16Array(indices)
  };
}

function createCone(segments = 64, uRepeat = 3) {
  const positions = [], normals = [], tangents = [], texCoords = [], indices = [];
  const slantLen = Math.sqrt(5);

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const theta = 2 * Math.PI * u;
    const s = Math.sin(theta);
    const c = Math.cos(theta);

    positions.push(s, -1, c);
    normals.push((2 * s) / slantLen, 1 / slantLen, (2 * c) / slantLen);
    tangents.push(c, 0, -s);
    texCoords.push(u * uRepeat, 0);

    positions.push(0, 1, 0);
    normals.push((2 * s) / slantLen, 1 / slantLen, (2 * c) / slantLen);
    tangents.push(c, 0, -s);
    texCoords.push(u * uRepeat, 1);
  }

  for (let i = 0; i < segments; i++) {
    const k = 2 * i;
    indices.push(k, k + 2, k + 3, k, k + 3, k + 1);
  }

  const center = positions.length / 3;
  positions.push(0, -1, 0);
  normals.push(0, -1, 0);
  tangents.push(1, 0, 0);
  texCoords.push(0.5, 0.5);

  for (let i = 0; i <= segments; i++) {
    const theta = 2 * Math.PI * i / segments;
    const s = Math.sin(theta);
    const c = Math.cos(theta);
    positions.push(s, -1, c);
    normals.push(0, -1, 0);
    tangents.push(1, 0, 0);
    texCoords.push(0.5 + 0.5 * s, 0.5 + 0.5 * c);
  }

  for (let i = 0; i < segments; i++) {
    const a = center + 1 + i;
    const b = a + 1;
    indices.push(center, b, a);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    tangents: new Float32Array(tangents),
    texCoords: new Float32Array(texCoords),
    indices: new Uint16Array(indices)
  };
}

function createTorus(slices = 32, loops = 32, r = 0.35, R = 0.75) {
  const positions = [], normals = [], tangents = [], texCoords = [], indices = [];

  for (let i = 0; i <= slices; i++) {
    const u = i / slices;
    const theta = u * 2 * Math.PI;
    const sTheta = Math.sin(theta);
    const cTheta = Math.cos(theta);

    for (let j = 0; j <= loops; j++) {
      const v = j / loops;
      const phi = v * 2 * Math.PI;
      const sPhi = Math.sin(phi);
      const cPhi = Math.cos(phi);

      const x = (R + r * cPhi) * sTheta;
      const y = r * sPhi;
      const z = (R + r * cPhi) * cTheta;

      positions.push(x, y, z);
      normals.push(cPhi * sTheta, sPhi, cPhi * cTheta);
      tangents.push(cTheta, 0, -sTheta);
      texCoords.push(u, v);
    }
  }

  for (let i = 0; i < slices; i++) {
    for (let j = 0; j < loops; j++) {
      const first = i * (loops + 1) + j;
      const second = first + loops + 1;
      indices.push(first, second, second + 1);
      indices.push(first, second + 1, first + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    tangents: new Float32Array(tangents),
    texCoords: new Float32Array(texCoords),
    indices: new Uint16Array(indices)
  };
}