// import * as THREE from 'three';
import { appendLog, updateSidebar} from './sidebar.js';
import { cubes, scene, raycaster, mouse, camera, renderer } from './cubeManager.js';

// Global array to track spheres
let spheres = [];
let myChart = null;

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

const calculateCentroid_selection = (cubes) => {
    let sumX = 0, sumY = 0, sumZ = 0;
    cubes.forEach(cube => {
        sumX += cube.position.x;
        sumY += cube.position.y;
        sumZ += cube.position.z;
    });
    return new THREE.Vector3(sumX / cubes.length, sumY / cubes.length, sumZ / cubes.length);
};


function onSphereClick(intersectedSphere) {
    const sphereAverages = calculateAverageAttributes(intersectedSphere);
    // const otherCubesAverages = calculateAverageAttributesForOtherCubes(intersectedSphere);
    const otherCubesAverages = calculateAverageAttributesForOtherCubes(intersectedSphere, cubes);


    // Prepare data for Chart.js
    const labels = Object.keys(sphereAverages);
    const sphereData = Object.values(sphereAverages);
    const otherCubesData = Object.values(otherCubesAverages);

    let attributesArray = [];
    Object.keys(sphereAverages).forEach((attribute) => {
        attributesArray.push({
            name: attribute,
            selectedSphereValue: sphereAverages[attribute],
            otherCubesValue: otherCubesAverages[attribute]
        });
    });

    // Sort based on the difference
    attributesArray.sort((a, b) => {
        let diffA = Math.abs(a.selectedSphereValue - a.otherCubesValue);
        let diffB = Math.abs(b.selectedSphereValue - b.otherCubesValue);
        return diffB - diffA;  // For descending order
    });


    const barChartData = {
        labels: attributesArray.map(attribute => attribute.name),
        datasets: [{
            label: 'Selected Sphere Average',
            data: attributesArray.map(attribute => attribute.selectedSphereValue),
            backgroundColor: 'blue',
            borderColor: 'blue',
            borderWidth: 1,
        }, {
            type: 'line',
            label: 'Other Cubes Average',
            data: attributesArray.map(attribute => attribute.otherCubesValue),
            borderColor: 'red',
            borderWidth: 2,
            fill: false
        }]
    };
    
    // Assuming 'groupsContentChart' is your canvas ID
    const ctx = document.getElementById('groupsContentChart').getContext('2d');

    // Destroy the existing chart if it exists
    if (myChart != null) {
        myChart.destroy();
    }

    // Create the new chart instance
    myChart = new Chart(ctx, {
        type: 'bar',
        data: barChartData,
        options: {
            scales: {
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 90,
                        minRotation: 90
                    }
                },
                y: {
                    suggestedMin: 0,
                    suggestedMax: 11
                }
            },
            layout: {
                padding: {
                    left: 2,
                    right: 2,
                    top: 5,
                    bottom: 50
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    const centroid = calculateCentroid_selection(intersectedSphere.userData.cubes);

    intersectedSphere.userData.cubes.sort((a, b) => {
        const distanceA = a.position.distanceTo(centroid);
        const distanceB = b.position.distanceTo(centroid);
        return distanceA - distanceB; // Sort in ascending order of distance
    });

    
    const imagesContainer = document.getElementById('groupsImagesContainer');
    imagesContainer.innerHTML = ''; // Clear existing images
    
    intersectedSphere.userData.cubes.forEach(cube => {
        const imageUrl = cube.userData.image; // Assuming 'image' holds the URL
        const cubeName = cube.userData.itemName; // Assuming 'itemName' holds the name
    
        const cubeContainer = document.createElement('div');
        cubeContainer.className = "cube-container"; // A class for styling
    
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = "Cube Image";
        img.className = "sidebar-cube-image"; // A class for styling
    
        const nameElement = document.createElement('span');
        nameElement.textContent = cubeName;
        nameElement.className = "cube-name"; // A class for styling
    
        cubeContainer.appendChild(img);
        cubeContainer.appendChild(nameElement);
        imagesContainer.appendChild(cubeContainer);
    });
    
    
    // Update the sidebar selector
    document.getElementById('sidebarSelector').value = 'groups';
    updateSidebar(); // Reflect the change
}
