import { appendLog, getModelAndParams, updateSidebarContent, setCubeImageInSidebar } from './sidebar.js';
import { updateSpheres, clearSpheres } from './sphereManager.js';
import { checkForSphereClick } from './sphereManager.js';

// Create scene, camera, and renderer
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Define some variables for rotation
let angle = 0; // Starting angle
let speed = 0.01; // Define this based on how fast you want the rotation to be

camera.position.z = 20;

// Attach renderer to 'my_dataviz' div
document.getElementById('my_dataviz').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);

let my_dataviz = document.getElementById('my_dataviz');
renderer.setSize(my_dataviz.clientWidth, my_dataviz.clientHeight);

controls.update();

// Container for cube features
export let cubes = [];


export const createOrUpdateCube = (data) => {

    clearCanvas();
    clearSpheres();

    const textureLoader = new THREE.TextureLoader();
    let cubeCreationPromises = [];

    for (let itemName in data) {
        const item = data[itemName];

        // Check if coordinates or image data are missing, skip to the next item if so
        if (!item.coordinates || !item.image || typeof item.coordinates.x === 'undefined' || typeof item.coordinates.y === 'undefined' || typeof item.coordinates.z === 'undefined') {
            appendLog(`Skipping ${itemName} due to missing data.`);
            continue; // Skip this iteration and move to the next item
        }

        // Create a new promise for each cube
        let cubePromise = new Promise((resolve) => {  // Note: Only using resolve here
            const xPos = parseFloat(item.coordinates.x);
            const yPos = parseFloat(item.coordinates.y);
            const zPos = parseFloat(item.coordinates.z);
            const jpgData = item.image;

            textureLoader.load(jpgData, 
                (texture) => {
                    const material = new THREE.MeshBasicMaterial({ map: texture });
                    const geometry = new THREE.BoxGeometry();
                    const cube = new THREE.Mesh(geometry, material);

                    cube.position.set(xPos, yPos, zPos);
                    cube.userData = { ...item, x: xPos, y: yPos, z: zPos, imageData: jpgData, itemName };
                    scene.add(cube);
                    cubes.push(cube);

                    resolve(); // Resolve the promise when the cube is loaded
                },
                undefined, 
                (error) => {
                    appendLog(`Failed to load texture from URL ${jpgData}. Error: ${error}`);
                    resolve(); // Still resolve the promise on error but without an 'error' flag to allow iteration to continue
                }
            );
        });

        cubeCreationPromises.push(cubePromise);
    }

    // Return a promise that resolves when all cubes have been created, including those that failed to load
    return Promise.all(cubeCreationPromises);
};



// Make function globally available
window.createOrUpdateCube = createOrUpdateCube;





// Animation
export const animate = function () {
    requestAnimationFrame(animate);

    // Update the camera's position
    scene.rotation.y += 0.001;

    angle += speed; // Increment the angle

    // Ensure the camera keeps looking at the center of the scene
    camera.lookAt(scene.position);

    controls.update();

    renderer.render(scene, camera);

};

animate(); 

// CLICK INTERACTION
renderer.domElement.addEventListener('click', onMouseClick, false);

// ray caster
export const raycaster = new THREE.Raycaster();
export const mouse = new THREE.Vector2();

function onCubeClick(intersectedCube) {

    // Make sure to access nested 'object' and then 'userData' properties
    const imageUrl = intersectedCube.userData.image;
    // appendLog(`image url - ${imageUrl}`);
    const itemName = intersectedCube.userData.itemName;
    
    // appendLog(`image name - ${itemName}`);
    const originalRatings = intersectedCube.userData.originalRatings;
    // appendLog(`original ratings - ${JSON.stringify(originalRatings)}`);

    setCubeImageInSidebar(imageUrl, itemName, originalRatings, cubes);
    
    // Update the new sidebar selector to 'Cube Analytics'
    const newSidebarSelector = document.getElementById('newSidebarSelector');
    newSidebarSelector.value = 'cubeContent';
    // document.getElementById('cubeName').textContent = itemName;

    // Call the updateSidebarContent function with the new value
    updateSidebarContent('cubeContent');
}


// Check for type of object clicked
function checkForCubeClick() {

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(cubes);

    if (intersects.length > 0) {

        // Assuming cubes are the primary target, but can be refined further
        onCubeClick(intersects[0].object);
    }
}

// Check for user clocking mouse
function onMouseClick(event) {

    // ensure only expected items for clickery ect.
    if(event.target !== renderer.domElement) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    checkForCubeClick();
    checkForSphereClick(); 
}

function createHistogramData(distances, binCount) {
    let maxDistance = Math.max(...distances);
    let minDistance = Math.min(...distances);
    let binSize = (maxDistance - minDistance) / binCount;
    let histogramData = new Array(binCount).fill(0);
    let binRanges = new Array(binCount);

    distances.forEach(distance => {
        let binIndex = Math.floor((distance - minDistance) / binSize);
        binIndex = binIndex >= binCount ? binCount - 1 : binIndex;
        histogramData[binIndex]++;
    });

    for (let i = 0; i < binCount; i++) {
        let rangeStart = minDistance + i * binSize;
        let rangeEnd = rangeStart + binSize;
        binRanges[i] = `${rangeStart.toFixed(2)}-${rangeEnd.toFixed(2)}`;
    }

    return { histogramData, binRanges };
}


function calculateDistancesToCentroid(cubes) {
    const centroid = calculateCentroid(cubes);
    let distances = cubes.map(cube => {
        return Math.sqrt(
            Math.pow(cube.position.x - centroid.x, 2) +
            Math.pow(cube.position.y - centroid.y, 2) +
            Math.pow(cube.position.z - centroid.z, 2)
        );
    });
    return distances;
}


function calculateCentroid(cubes) {
    let sumX = 0, sumY = 0, sumZ = 0, count = 0;
    cubes.forEach(cube => {
        sumX += cube.position.x;
        sumY += cube.position.y;
        sumZ += cube.position.z;
        count++;
    });
    return { x: sumX / count, y: sumY / count, z: sumZ / count };
}

function calculateBoundingBox(cubes) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    cubes.forEach(cube => {
        minX = Math.min(cube.position.x, minX);
        minY = Math.min(cube.position.y, minY);
        minZ = Math.min(cube.position.z, minZ);
        maxX = Math.max(cube.position.x, maxX);
        maxY = Math.max(cube.position.y, maxY);
        maxZ = Math.max(cube.position.z, maxZ);
    });

    return { minX, minY, minZ, maxX, maxY, maxZ };
}

function calculatePairwiseDistances(cubes) {
    let totalDistance = 0;
    let count = 0;
    for (let i = 0; i < cubes.length; i++) {
        for (let j = i + 1; j < cubes.length; j++) {
            let distance = Math.sqrt(
                Math.pow(cubes[i].position.x - cubes[j].position.x, 2) +
                Math.pow(cubes[i].position.y - cubes[j].position.y, 2) +
                Math.pow(cubes[i].position.z - cubes[j].position.z, 2)
            );
            totalDistance += distance;
            count++;
        }
    }
    return totalDistance / count; // average distance
}

function estimateDensity(cubes, radius) {
    let densities = cubes.map(cube => {
        let count = 0;
        cubes.forEach(otherCube => {
            let distance = Math.sqrt(
                Math.pow(cube.position.x - otherCube.position.x, 2) +
                Math.pow(cube.position.y - otherCube.position.y, 2) +
                Math.pow(cube.position.z - otherCube.position.z, 2)
            );
            if (distance <= radius) count++;
        });
        return count; // Number of points within the radius
    });
    return densities; // Array of densities for each point
}

function drawBoundingBox(boundingBox) {
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const points = [];
    points.push(new THREE.Vector3(boundingBox.minX, boundingBox.minY, boundingBox.minZ));
    points.push(new THREE.Vector3(boundingBox.maxX, boundingBox.minY, boundingBox.minZ));
    points.push(new THREE.Vector3(boundingBox.maxX, boundingBox.maxY, boundingBox.minZ));
    points.push(new THREE.Vector3(boundingBox.minX, boundingBox.maxY, boundingBox.minZ));
    points.push(new THREE.Vector3(boundingBox.minX, boundingBox.minY, boundingBox.minZ));
    points.push(new THREE.Vector3(boundingBox.minX, boundingBox.minY, boundingBox.maxZ));
    points.push(new THREE.Vector3(boundingBox.maxX, boundingBox.minY, boundingBox.maxZ));
    points.push(new THREE.Vector3(boundingBox.maxX, boundingBox.maxY, boundingBox.maxZ));
    points.push(new THREE.Vector3(boundingBox.minX, boundingBox.maxY, boundingBox.maxZ));
    points.push(new THREE.Vector3(boundingBox.minX, boundingBox.minY, boundingBox.maxZ));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
}

function calculateDensityHistogramData(densities) {
    let frequencyMap = {};
    densities.forEach(density => {
        frequencyMap[density] = (frequencyMap[density] || 0) + 1;
    });

    let histogramData = [];
    let labels = [];
    for (let density in frequencyMap) {
        labels.push(density);
        histogramData.push(frequencyMap[density]);
    }

    return { histogramData, labels };
}

export function updateVectorMetricsContent() {

    appendLog(`Vector Metrics - Start`);
    const vectorMetricsContent = document.getElementById('vectorMetricsContent');
    vectorMetricsContent.innerHTML = '<p>Vector SALLY Metrics:</p>'; // Reset content

    const centroid = calculateCentroid(cubes);
    const boundingBox = calculateBoundingBox(cubes);
    const avgDistance = calculatePairwiseDistances(cubes);
    const densities = estimateDensity(cubes, (avgDistance / 2).toFixed(0));

    // Display these values in vectorMetricsContent
    vectorMetricsContent.innerHTML += `<p>Centroid: (${centroid.x.toFixed(8)}, ${centroid.y.toFixed(8)}, ${centroid.z.toFixed(8)})</p>`;
    vectorMetricsContent.innerHTML += `<p>Bounding Box: Min (${boundingBox.minX.toFixed(2)}, ${boundingBox.minY.toFixed(2)}, ${boundingBox.minZ.toFixed(2)}) - Max (${boundingBox.maxX.toFixed(2)}, ${boundingBox.maxY.toFixed(2)}, ${boundingBox.maxZ.toFixed(2)})</p>`;
    vectorMetricsContent.innerHTML += `<p>Average Pairwise Distance: ${avgDistance.toFixed(2)}</p>`;
    vectorMetricsContent.innerHTML += `<p>Estimated Density: ${densities}</p>`;

    // Calculate distances to centroid and create histogram data
    const distances = calculateDistancesToCentroid(cubes);
    const { histogramData, binRanges } = createHistogramData(distances, 10); // 10 bins

    // Create the histogram chart
    const histogramCanvas = document.createElement('canvas');
    vectorMetricsContent.appendChild(histogramCanvas);
    const ctx = histogramCanvas.getContext('2d');

    drawBoundingBox(boundingBox);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: binRanges, // Use binRanges as labels
            datasets: [{
                label: 'Number of Cubes',
                data: histogramData,
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    const densityHistogramCanvas = document.createElement('canvas');
    vectorMetricsContent.appendChild(densityHistogramCanvas);
    const densityCtx = densityHistogramCanvas.getContext('2d');

    // Calculate histogram data for densities
    const { histogramData: densityHistogramData, labels: densityLabels } = calculateDensityHistogramData(densities);

    // Create the density histogram chart
    new Chart(densityCtx, {
        type: 'bar',
        data: {
            labels: densityLabels,
            datasets: [{
                label: 'Frequency of Density',
                data: densityHistogramData,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

}



export function clearCanvas() {

    cubes.forEach(cube => scene.remove(cube));
    cubes = [];

    while(scene.children.length > 0){ 
        let object = scene.children[0];

        if (object.isMesh) {
            // Dispose geometry and material
            if (object.geometry) {
                object.geometry.dispose();
            }

            if (object.material) {
                if (object.material instanceof Array) {
                    // In case of multi-materials
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }

        scene.remove(object); 
    }
}
