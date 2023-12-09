// import * as THREE from 'three';
import { appendLog} from './sidebar.js';
import { cubes, scene } from './cubeManager.js';

// Global array to track spheres
let spheres = [];

// Function to clear all spheres from the scene
const clearSpheres = () => {
    spheres.forEach(sphere => {
        scene.remove(sphere); // Remove the sphere from the scene
        if (sphere.geometry) sphere.geometry.dispose(); // Dispose geometry
        if (sphere.material) sphere.material.dispose(); // Dispose material
    });
    spheres.length = 0; // Clear the array
};

const canAddSphere = (newSphere, maxOverlapPercentage) => {
    for (let existingSphere of spheres) {
        if (isOverlapTooMuch(newSphere, existingSphere, maxOverlapPercentage)) {
            return false; // Do not add the new sphere if overlap is too much
        }
    }
    return true; // Add the sphere if all is good
};

const isOverlapTooMuch = (sphere1, sphere2, maxOverlapPercentage) => {
    const distanceBetweenCenters = sphere1.position.distanceTo(sphere2.position);
    const radiiSum = sphere1.geometry.parameters.radius + sphere2.geometry.parameters.radius;
    const allowedOverlapDistance = radiiSum * (1 - (maxOverlapPercentage / 100));

    return distanceBetweenCenters < allowedOverlapDistance;
};


const calculateCentroid = (group) => {
    let sumX = 0, sumY = 0, sumZ = 0;
    group.forEach(cube => {
        sumX += cube.position.x;
        sumY += cube.position.y;
        sumZ += cube.position.z;
    });
    return {
        x: sumX / group.length,
        y: sumY / group.length,
        z: sumZ / group.length
    };
};


const groupCubes = (cubes, threshold) => {
    let groups = [];
    let visited = new Set();

    // Helper function to find all cubes close to the given cube
    const findCloseCubes = (cube, group) => {
        visited.add(cube);
        group.push(cube);

        // Check closeness with all other cubes
        cubes.forEach(otherCube => {
            if (!visited.has(otherCube)) {
                const distanceBetweenCubes = cube.position.distanceTo(otherCube.position);
                if (distanceBetweenCubes < threshold) {
                    findCloseCubes(otherCube, group); // Recursive call
                }
            }
        });
    };

    // Iterate over each cube and group them
    cubes.forEach(cube => {
        if (!visited.has(cube)) {
            let group = [];
            findCloseCubes(cube, group); // Find all close cubes recursively
            groups.push(group); // Add this group to the list of groups
        }
    });

    return groups;
};

// Distance calculation method for THREE.Vector3
THREE.Vector3.prototype.distanceTo = function (v) {
    const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};


// This function will check for closeness between all cubes and create spheres around those that are close
// export const encaseCubesInSpheres = (cubes, scene, threshold = 0.5) => {
export const encaseCubesInSpheres = (cubes, scene, threshold = 0.5, minCubesPerSphere = 1, maxOverlapPercentage = 100) => {
    clearSpheres(); // Clear previous spheres first

    const groups = groupCubes(cubes, threshold); // Use the groupCubes function to group cubes
    groups.forEach(group => {
        // Only create spheres for groups with enough cubes
        if (group.length >= minCubesPerSphere) {
            const sphereGeometry = new THREE.SphereGeometry(threshold * 1.1, 32, 32);
            const sphereMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.5
            });

            // Calculate the centroid of the group for sphere positioning
            const centroid = calculateCentroid(group);
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.set(centroid.x, centroid.y, centroid.z);

            // Now check for overlap before adding the sphere
            if (canAddSphere(sphere, maxOverlapPercentage)) {
                scene.add(sphere);
                spheres.push(sphere); // Track the sphere
            }
        }
    });
};
    




export const updateSpheres = (newThreshold) => {

    // Clear existing spheres first
    clearSpheres();

    // Encase cubes in new spheres with updated threshold
    encaseCubesInSpheres(cubes, scene, newThreshold);
  };
