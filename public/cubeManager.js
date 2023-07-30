// createOrUpdateCube.js

import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';

export const createOrUpdateCube = (scene) => (data) => {

    appendLog(`createOrUpdateCube Started: ${data}`);

    // Clear previous cubes if necessary
    while(scene.children.length > 0){ 
        scene.remove(scene.children[0]); 
    }

    appendLog(`Clear previous cubes`);

    data.forEach((item) => {
        const xPos = parseFloat(item.coordinates[0]);
        const yPos = parseFloat(item.coordinates[1]);
        const zPos = parseFloat(item.coordinates[2]);
        const jpgPath = item.image;

        appendLog(`Cube for each: ${item}`);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(jpgPath, function (texture) {
            const material = new THREE.MeshBasicMaterial({ map: texture });
            const geometry = new THREE.BoxGeometry();
            const cube = new THREE.Mesh(geometry, material);

            cube.position.set(xPos, yPos, zPos);
            appendLog(`Load Texture: ${item}`);

            // Add fields to cube.userData
            cube.userData = { ...item, x: xPos, y: yPos, z: zPos, path: jpgPath };

            scene.add(cube);

            appendLog(`Cube added to scene: ${cube}`);

            // Add event listeners...
            // Your previous setup here...

        }, undefined, function (error) {
            appendLog(`Cube creation error: ${error}`);
            console.error('An error occurred while loading the texture:', error);
        });
    });
}

// Make function globally available
window.createOrUpdateCube = createOrUpdateCube;

