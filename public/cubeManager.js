// import * as THREE from 'three';
// import * as THREE from './node_modules/three/build/three.module.js';
// import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';

import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';

// Create scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild(renderer.domElement);
// document.getElementById('my_dataviz').appendChild(renderer.domElement);

camera.position.z = 20;

// Attach renderer to 'my_dataviz' div
document.getElementById('my_dataviz').appendChild(renderer.domElement);

// OrbitControls for navigation
// const controls = new OrbitControls(camera, renderer.domElement);
const controls = new THREE.OrbitControls(camera, renderer.domElement);

let my_dataviz = document.getElementById('my_dataviz');
renderer.setSize(my_dataviz.clientWidth, my_dataviz.clientHeight);

controls.update();

export const createOrUpdateCube = (data) => {

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
        const jpgData = item.imageUrl; // Assuming 'item.imageData' is a base64 encoded image data

        appendLog(`Cube for each: ${item}`);

        const image = new Image();
        image.onload = function () {
            const texture = new THREE.Texture();
            texture.image = this;
            texture.needsUpdate = true;

            const material = new THREE.MeshBasicMaterial({ map: texture });
            const geometry = new THREE.BoxGeometry();
            const cube = new THREE.Mesh(geometry, material);

            cube.position.set(xPos, yPos, zPos);
            appendLog(`Load Texture: ${item}`);

            // Add fields to cube.userData
            cube.userData = { ...item, x: xPos, y: yPos, z: zPos, imageData: jpgData };

            scene.add(cube);

            appendLog(`Cube added to scene: ${cube}`);
            appendLog(`Iamge being added to scene: ${jpgData}`);

            // Add event listeners...
            // Your previous setup here...
        };
        image.onerror = function (error) {
            appendLog(`Cube creation error: ${error}`);
            console.error('An error occurred while loading the texture:', error);
        };
        // image.src = 'data:image/jpeg;base64,' + jpgData;
        appendLog(`Iamge being added to scene: ${jpgData}`);
        console.log('Loading image data:', jpgData);
        image.src = 'data:image/jpeg;base64,' + jpgData;

    });
}


// Make function globally available
window.createOrUpdateCube = createOrUpdateCube;

// Animation
export const animate = function () {
  requestAnimationFrame(animate);

  // required if controls.enableDamping or controls.autoRotate are set to true
  controls.update();

  renderer.render(scene, camera);
};

animate(); 
