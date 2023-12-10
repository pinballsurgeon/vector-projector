// import * as THREE from 'three';
import { appendLog, updateSidebar} from './sidebar.js';
import { cubes, scene, raycaster, mouse, camera, renderer } from './cubeManager.js';

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
    appendLog(`Can Add Sphere Function`);
    for (let existingSphere of spheres) {
        if (isOverlapTooMuch(newSphere, existingSphere, maxOverlapPercentage)) {
            return false; // Do not add the new sphere if overlap is too much
        }
    }
    return true; // Add the sphere if all is good
};

const isOverlapTooMuch = (sphere1, sphere2, maxOverlapPercentage) => {
    appendLog(`Overlap Too Much Function`);
    const distanceBetweenCenters = sphere1.position.distanceTo(sphere2.position);
    const radiiSum = sphere1.geometry.parameters.radius + sphere2.geometry.parameters.radius;
    const allowedOverlapDistance = radiiSum * (1 - (maxOverlapPercentage / 100));

    return distanceBetweenCenters < allowedOverlapDistance;
};


const calculateCentroid = (group) => {
    appendLog(`calculateCentroid Function`);
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

    appendLog(`Group Cubes Function`);
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

// sphere cube averages
export const calculateAverageAttributes = (sphere) => {
    if (!sphere.userData || !sphere.userData.cubes) {
        return null;
    }

    let totalAttributes = {};
    let cubeCount = sphere.userData.cubes.length;

    sphere.userData.cubes.forEach(cube => {
        for (let attr in cube.userData.originalRatings) {
            if (!totalAttributes[attr]) {
                totalAttributes[attr] = 0;
            }
            totalAttributes[attr] += cube.userData.originalRatings[attr];
        }
    });

    // Averaging the attributes
    for (let attr in totalAttributes) {
        totalAttributes[attr] = totalAttributes[attr] / cubeCount;
    }

    return totalAttributes;
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


            if (canAddSphere(sphere, maxOverlapPercentage)) {
                scene.add(sphere);
                sphere.userData = { cubes: group }; // Store the group of cubes in the sphere's userData
                spheres.push(sphere); // Track the sphere
            }

        }
    });
};
    

// Update spheres based on the slider values
export const updateSpheres = (threshold, minCubesPerSphere, maxOverlapPercentage) => {
    clearSpheres(); // Clear existing spheres
    encaseCubesInSpheres(cubes, scene, threshold, minCubesPerSphere, maxOverlapPercentage);
};


export function checkForSphereClick() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(spheres); // Assuming 'spheres' is your array of sphere objects

    if (intersects.length > 0) {
        onSphereClick(intersects[0].object);
    }
}

export const calculateAverageAttributesForOtherCubes = (selectedSphere, allCubes) => {
    const selectedCubesSet = new Set(selectedSphere.userData.cubes);

    let totalAttributes = {};
    let nonSelectedCubesCount = 0;

    allCubes.forEach(cube => {
        if (!selectedCubesSet.has(cube)) {
            nonSelectedCubesCount++;
            for (let attr in cube.userData.originalRatings) {
                if (!totalAttributes[attr]) {
                    totalAttributes[attr] = 0;
                }
                totalAttributes[attr] += cube.userData.originalRatings[attr];
            }
        }
    });

    if (nonSelectedCubesCount === 0) {
        return null; // Return null if there are no non-selected cubes
    }

    // Averaging the attributes for non-selected cubes
    for (let attr in totalAttributes) {
        totalAttributes[attr] = totalAttributes[attr] / nonSelectedCubesCount;
    }

    return totalAttributes;
};

function onSphereClick(intersectedSphere) {
    const sphereAverages = calculateAverageAttributes(intersectedSphere);
    const otherCubesAverages = calculateAverageAttributesForOtherCubes(intersectedSphere);

    // Prepare data for Chart.js
    const labels = Object.keys(sphereAverages);
    const sphereData = Object.values(sphereAverages);
    const otherCubesData = Object.values(otherCubesAverages);

    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Sphere Average',
                data: sphereData,
                backgroundColor: 'blue'
            },
            {
                label: 'Other Cubes Average',
                data: otherCubesData,
                backgroundColor: 'grey'
            }
        ]
    };

    const config = {
        type: 'bar',
        data: data,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    };

    // Assuming 'groupsContentChart' is the id of your canvas element in the sidebar
    const ctx = document.getElementById('groupsContentChart').getContext('2d');
    new Chart(ctx, config); // Create the chart

    // Update the sidebar selector
    document.getElementById('sidebarSelector').value = 'groupsContent';
    updateSidebar(); // Reflect the change
}
