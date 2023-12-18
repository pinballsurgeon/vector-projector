import { appendLog } from './sidebar.js';

export function calculateConvexHull(cubes) {
    appendLog(`vectorMetrics: Initiated`);

    const vertices = [];
    cubes.forEach(cube => {
        appendLog(`vectorMetrics: Cube added ${cube.position.x}`);
        vertices.push(cube.position.x, cube.position.y, cube.position.z);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const convexGeometry = new THREE.ConvexBufferGeometry(geometry);
    appendLog(`vectorMetrics: Return ${convexGeometry}`);
    return convexGeometry; // Simplified for example purposes
}
