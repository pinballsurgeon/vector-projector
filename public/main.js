import {updateSidebar, initializeModels, initializeModelParams, initializePrompts, appendLog} from './sidebar.js';
import { differentiatingTopicsGenerator } from './attributeGenerator.js';
import { listPerpetuator } from './listPerpetuator.js';
import { generateRatings, generateRange } from './ratingGenerator.js';
import { createOrUpdateCube } from './cubeManager.js';

// Create scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// You may want to add OrbitControls here so that you can navigate through the scene
const controls = new THREE.OrbitControls(camera);
controls.update();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Attach renderer to 'my_dataviz' div
document.getElementById('my_dataviz').appendChild(renderer.domElement);

const createOrUpdateCubeWithScene = createOrUpdateCube(scene);

// SIDE BAR HANDLER
document.addEventListener("DOMContentLoaded", function(){
  const sidebarSelector = document.getElementById("sidebarSelector");
  const toggleSidebarButton = document.getElementById("toggleSidebarButton");
  const sidebar = document.getElementById("sidebar");

  sidebarSelector.addEventListener("change", updateSidebar);

  toggleSidebarButton.addEventListener("click", function() {
    sidebar.classList.toggle("open");
  });

  updateSidebar();                    // Update sidebar on page load
  initializeModels();                 // Fetch models on page load
  initializeModelParams();            // Fetch model parameters on page load
  initializePrompts();                // Fetch prompts on page load

});

// TOPIC HANDLER
document.getElementById('askButton').addEventListener('click', async () => {
  const rootList = await listPerpetuator();
});

// DIFFERENTIATING ATTRIBUTES
document.getElementById('listButton').addEventListener('click', differentiatingTopicsGenerator);

// Event listener for 'vectorizeButton'
document.getElementById('vectorizeButton').addEventListener('click', async () => {
    const ratings = await generateRatings(createOrUpdateCubeWithScene);
  
    // Display the ratings in 'llmRatings' div
    document.getElementById('llmRatings').innerText = JSON.stringify(ratings, null, 2);
  });
  
  // Animation
  const animate = function () {
    requestAnimationFrame(animate);
  
    // required if controls.enableDamping or controls.autoRotate are set to true
    controls.update();
  
    renderer.render(scene, camera);
  };
  
  animate();