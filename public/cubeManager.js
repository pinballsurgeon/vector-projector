import { appendLog, getModelAndParams, updateSidebar, setCubeImageInSidebar } from './sidebar.js';

// Create scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
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
let cubes = [];





export const createOrUpdateCube = (data) => {
   
    const textureLoader = new THREE.TextureLoader();

    for (let itemName in data) {
        const item = data[itemName];
        
        const xPos = parseFloat(item.coordinates.x);
        const yPos = parseFloat(item.coordinates.y);
        const zPos = parseFloat(item.coordinates.z);
        const jpgData = item.image;

        textureLoader.load(jpgData, 
            (texture) => { // onLoad callback
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
                    imageData: jpgData,
                    itemName
                };

                scene.add(cube);
                cubes.push(cube);  // Add cube to cubes array

                appendLog(`Cube Structure ${cube}`);
                appendLog(`Image being added to scene: ${jpgData}`);
            },
            undefined, // onProgress callback can be undefined if not needed
            (error) => { // onError callback
                appendLog(`Failed to load texture from URL ${jpgData}. Error: ${error}`);
            }
        );
    }
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
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onCubeClick(intersectedCube) {
    appendLog(`Clicked cube - ${JSON.stringify(intersectedCube)}`);

    try {
        appendLog(`Clicked userdata - ${JSON.stringify(intersectedCube.userData)}`);
    }
    catch {
        appendLog(`Clicked object - ${JSON.stringify(intersectedCube.object)}`);
    }


    // Make sure to access nested 'object' and then 'userData' properties
    const imageUrl = intersectedCube.userData.image;
    appendLog(`image url - ${imageUrl}`);
    const itemName = intersectedCube.userData.itemName;
    appendLog(`image name - ${itemName}`);
    const originalRatings = intersectedCube.userData.originalRatings;
    appendLog(`original ratings - ${JSON.stringify(originalRatings)}`);

    setCubeImageInSidebar(imageUrl, itemName, originalRatings, cubes);

    if (document.getElementById('sidebarSelector').value === 'cubeContent') {
        updateSidebar();
    }
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
}


