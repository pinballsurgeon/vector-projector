import { appendLog, updateSidebarContent, setCubeImageInSidebar } from './sidebar.js';
import { clearSpheres } from './sphereManager.js';
import { checkForSphereClick } from './sphereManager.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
export const renderer = new THREE.WebGLRenderer({ antialias: true });

let angle = 0;
let speed = 0.01;

camera.position.z = 20;

document.getElementById('my_dataviz').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);

let my_dataviz = document.getElementById('my_dataviz');
renderer.setSize(my_dataviz.clientWidth, my_dataviz.clientHeight);

controls.update();

export let cubes = [];

function createTextSprite(message, fontSize = 24, fontFace = 'Arial', textColor = '#FFFFFF') {

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${fontSize}px ${fontFace}`;

    const metrics = context.measureText(message);
    const textWidth = metrics.width;
    canvas.width = textWidth;
    canvas.height = fontSize * 1.5;

    context.font = `${fontSize}px ${fontFace}`;
    context.fillStyle = textColor;
    context.fillText(message, 0, fontSize);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 1, 1);

    return sprite;
}


export const createOrUpdateCube = (data) => {

    clearCanvas();
    clearSpheres();

    const textureLoader = new THREE.TextureLoader();
    let cubeCreationPromises = [];

    const keys = Object.keys(data);
    for (let i = keys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    
    const selectedKeys = keys.slice(0, 5);

    for (let itemName in data) {
        const item = data[itemName];

        if (!item.coordinates || !item.image || typeof item.coordinates.x === 'undefined' || typeof item.coordinates.y === 'undefined' || typeof item.coordinates.z === 'undefined') {
            appendLog(`Skipping ${itemName} due to missing data.`);
            continue; 
        }

        let cubePromise = new Promise((resolve) => { 
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

                    let x_label_offset = 0;
                    let y_label_offset = 0;

                    if (cube.position.x < 0) {
                        x_label_offset = -2.5;
                    } else {
                        x_label_offset = 2.5;
                    }

                    if (cube.position.y < 0) {
                        y_label_offset = -2.5;
                    } else {
                        y_label_offset = 2.5;
                    }

                    if (selectedKeys.includes(cube.userData.itemName)) {
                        const labelSprite = createTextSprite(cube.userData.itemName);
                        labelSprite.position.set(cube.position.x + x_label_offset, cube.position.y + y_label_offset, cube.position.z); 
                        scene.add(labelSprite);
                    }

                    if (selectedKeys.includes(cube.userData.itemName)) {
                        const material = new THREE.LineBasicMaterial({ color: 0xffffff });
                        const points = [];
                        points.push(new THREE.Vector3(cube.position.x, cube.position.y, cube.position.z));
                        points.push(new THREE.Vector3(cube.position.x + x_label_offset, cube.position.y + y_label_offset, cube.position.z));
                        
                        const geometry = new THREE.BufferGeometry().setFromPoints(points);
                        const line = new THREE.Line(geometry, material);
                        scene.add(line);
                    }

                    resolve();
                },
                undefined, 
                (error) => {
                    appendLog(`Failed to load texture from URL ${jpgData}. Error: ${error}`);
                    resolve(); 
                }
            );
        });

        cubeCreationPromises.push(cubePromise);
    }

    return Promise.all(cubeCreationPromises);
};

window.createOrUpdateCube = createOrUpdateCube;

export const animate = function () {
    requestAnimationFrame(animate);

    scene.rotation.y += 0.001;

    angle += speed; 

    camera.lookAt(scene.position);

    controls.update();

    renderer.render(scene, camera);

};

animate(); 

renderer.domElement.addEventListener('click', onMouseClick, false);

export const raycaster = new THREE.Raycaster();
export const mouse = new THREE.Vector2();

function onCubeClick(intersectedCube) {

    const imageUrl = intersectedCube.userData.image;
    const itemName = intersectedCube.userData.itemName;
    

    const originalRatings = intersectedCube.userData.originalRatings;

    setCubeImageInSidebar(imageUrl, itemName, originalRatings, cubes);
    
    const newSidebarSelector = document.getElementById('newSidebarSelector');
    newSidebarSelector.value = 'cubeContent';

    updateSidebarContent('cubeContent');
}

function checkForCubeClick() {

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(cubes);

    if (intersects.length > 0) {

        onCubeClick(intersects[0].object);
    }
}

function onMouseClick(event) {

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
    return totalDistance / count;
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
        return count;
    });
    return densities;
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
    vectorMetricsContent.innerHTML = '<p>Vector SALLY Metrics:</p>';

    const centroid = calculateCentroid(cubes);
    const boundingBox = calculateBoundingBox(cubes);
    const avgDistance = calculatePairwiseDistances(cubes);
    const densities = estimateDensity(cubes, (avgDistance / 2).toFixed(0));

    vectorMetricsContent.innerHTML += `<p>Centroid: (${centroid.x.toFixed(8)}, ${centroid.y.toFixed(8)}, ${centroid.z.toFixed(8)})</p>`;
    vectorMetricsContent.innerHTML += `<p>Bounding Box: Min (${boundingBox.minX.toFixed(2)}, ${boundingBox.minY.toFixed(2)}, ${boundingBox.minZ.toFixed(2)}) - Max (${boundingBox.maxX.toFixed(2)}, ${boundingBox.maxY.toFixed(2)}, ${boundingBox.maxZ.toFixed(2)})</p>`;
    vectorMetricsContent.innerHTML += `<p>Average Pairwise Distance: ${avgDistance.toFixed(2)}</p>`;
    vectorMetricsContent.innerHTML += `<p>Estimated Density: ${densities}</p>`;

    const distances = calculateDistancesToCentroid(cubes);
    const { histogramData, binRanges } = createHistogramData(distances, 10);

    const histogramCanvas = document.createElement('canvas');
    vectorMetricsContent.appendChild(histogramCanvas);
    const ctx = histogramCanvas.getContext('2d');

    drawBoundingBox(boundingBox);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: binRanges, 
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

    const { histogramData: densityHistogramData, labels: densityLabels } = calculateDensityHistogramData(densities);

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
            if (object.geometry) {
                object.geometry.dispose();
            }

            if (object.material) {
                if (object.material instanceof Array) {

                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }

        scene.remove(object); 
    }
}

// Global array to keep track of labels and lines for easy removal
let labelsAndLines = [];

function updateRandomLabels() {
    labelsAndLines.forEach(obj => scene.remove(obj));
    labelsAndLines = [];

    if (cubes.length < 5) return;

    let selectedCubes = [];
    let indices = new Set();
    while (indices.size < 5) {
        const randomIndex = Math.floor(Math.random() * cubes.length);
        indices.add(randomIndex);
    }
    indices.forEach(index => selectedCubes.push(cubes[index]));

    selectedCubes.forEach(cube => {
        const x_label_offset = cube.position.x < 0 ? -2.5 : 2.5;
        const y_label_offset = cube.position.y < 0 ? -2.5 : 2.5;

        const labelSprite = createTextSprite(cube.userData.itemName);
        labelSprite.position.set(cube.position.x + x_label_offset, cube.position.y + y_label_offset, cube.position.z);
        scene.add(labelSprite);
        labelsAndLines.push(labelSprite);

        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const points = [new THREE.Vector3(cube.position.x, cube.position.y, cube.position.z),
                        new THREE.Vector3(cube.position.x + x_label_offset, cube.position.y + y_label_offset, cube.position.z)];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        labelsAndLines.push(line);
    });
}

window.addEventListener('load', () => {
    setInterval(updateRandomLabels, 5000);
});
