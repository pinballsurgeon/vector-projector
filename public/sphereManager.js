// import * as THREE from 'three';
import { appendLog} from './sidebar.js';
import { cubes, scene } from './cubeManager.js';

// Global array to track spheres
let spheres = [];

// Function to clear all spheres from the scene
const clearSpheres = () => {
    appendLog(`CHECKING SPHERES ${spheres}`);
    spheres.forEach(sphere => {
        appendLog(`SPHERES CLEARED ${sphere}`);
        scene.remove(sphere);
    });
    spheres = [];
};

// This function will check for closeness between all cubes and create spheres around those that are close
export const encaseCubesInSpheres = (cubes, scene, threshold = 0.5) => {

    appendLog(`SPHERES HERES`);
    const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00, // green color
        transparent: true,
        opacity: 0.5
    });

    // Function to calculate the distance between two points in 3D space
    const distance = (cube1, cube2) => {
        const dx = cube1.position.x - cube2.position.x;
        const dy = cube1.position.y - cube2.position.y;
        const dz = cube1.position.z - cube2.position.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    // Iterate over each cube and check for closeness with all other cubes
    cubes.forEach((cube1, index) => {
        cubes.slice(index + 1).forEach((cube2) => {
            if (distance(cube1, cube2) < threshold) {
                // Calculate the midpoint between the two cubes
                const midX = (cube1.position.x + cube2.position.x) / 2;
                const midY = (cube1.position.y + cube2.position.y) / 2;
                const midZ = (cube1.position.z + cube2.position.z) / 2;

                // Create a sphere at the midpoint with a radius slightly larger than the threshold
                const sphereGeometry = new THREE.SphereGeometry(threshold * 1.1, 32, 32);
                const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

                sphere.position.set(midX, midY, midZ);
                scene.add(sphere);
            }
        });
    });
};


export const updateSpheres = (newThreshold) => {

    // Clear existing spheres first
    clearSpheres();

    // Encase cubes in new spheres with updated threshold
    encaseCubesInSpheres(cubes, scene, newThreshold);
  };
