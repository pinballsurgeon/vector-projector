import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';

export function calculateConvexHull(cubes) {

    appendLog(`vectorMetrics: Initiated`);

    const geometry = new THREE.Geometry();

    appendLog(`vectorMetrics: Geometry ${geometry}`);
    cubes.forEach(cube => {
        appendLog(`vectorMetrics: Cube added ${cube.position.x}`);
        geometry.vertices.push(new THREE.Vector3(cube.position.x, cube.position.y, cube.position.z));
    });

    const convexGeometry = new THREE.ConvexBufferGeometry(geometry.vertices);
    // Process convexGeometry to extract meaningful information for display
    // This could be vertices, faces, etc., depending on what you want to show


    appendLog(`vectorMetrics: Return ${convexGeometry}`);
    return convexGeometry; // Simplified for example purposes
}