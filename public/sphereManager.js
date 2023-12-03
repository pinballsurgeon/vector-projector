
import { appendLog } from './sidebar.js';
import { cubes, scene } from './cubeManager.js';

// Global array to track spheres
let spheres = [];

// Function to clear all spheres from the scene
const clearSpheres = () => {
    spheres.forEach(sphere => {
        scene.remove(sphere);
    });
    spheres = [];
};

export const encaseCubesInSpheres = (cubes, scene, threshold = 0.5) => {
    // Clear existing spheres first
    clearSpheres();

    appendLog(`SPHERES HERES`);
    const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00, // green color
        transparent: true,
        opacity: 0.5
    });

    // ... [rest of your encaseCubesInSpheres function] ...

    // After creating a sphere, add it to the spheres array
    spheres.push(sphere);
};

export const updateSpheres = (newThreshold) => {
    // Encase cubes in new spheres with updated threshold
    encaseCubesInSpheres(cubes, scene, newThreshold);
};
