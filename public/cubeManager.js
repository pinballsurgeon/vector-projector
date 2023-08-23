import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';

// Create scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Define some variables for rotation
let radius = 20; // Define this based on your scene
let angle = 0; // Starting angle
let speed = 0.01; // Define this based on how fast you want the rotation to be

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
    appendLog(JSON.stringify(data));

    for (let itemName in data) {
        const item = data[itemName];
        
        const xPos = parseFloat(item.coordinates.x);
        const yPos = parseFloat(item.coordinates.y);
        const zPos = parseFloat(item.coordinates.z);
        const jpgData = item.image;

        appendLog(`Cube for each: ${JSON.stringify(item)}`);

        const texture = new THREE.TextureLoader().load(jpgData);

        const material = new THREE.MeshBasicMaterial({ map: texture });
        const geometry = new THREE.BoxGeometry();
        const cube = new THREE.Mesh(geometry, material);

        cube.position.set(xPos, yPos, zPos);

        // Add fields to cube.userData
        cube.userData = { 
            ...item, 
            x: xPos, 
            y: yPos, 
            z: zPos, 
            imageData: jpgData 
        };

        scene.add(cube);

        appendLog(`Cube added to scene: ${JSON.stringify(cube)}`);
        appendLog(`Image being added to scene: ${jpgData}`);
    }
};



// Make function globally available
window.createOrUpdateCube = createOrUpdateCube;

// Animation
export const animate = function () {
    requestAnimationFrame(animate);

    // Update the camera's position
    camera.position.x = radius * Math.sin(angle);
    camera.position.z = radius * Math.cos(angle);
    
    angle += speed; // Increment the angle

    // Ensure the camera keeps looking at the center of the scene
    camera.lookAt(scene.position);

    controls.update();

    renderer.render(scene, camera);
};

animate(); 
