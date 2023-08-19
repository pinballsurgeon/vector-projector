import {updateSidebar, initializeModels, initializeModelParams, initializePrompts, appendLog} from './sidebar.js';
import { differentiatingTopicsGenerator } from './attributeGenerator.js';
import { listPerpetuator } from './listPerpetuator.js';
import { generateRatings } from './ratingGenerator.js';
import { createOrUpdateCube } from './cubeManager.js';

// // Create scene, camera, and renderer
// const scene = new THREE.Scene();
// const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// const raycaster = new THREE.Raycaster();
// const mouse = new THREE.Vector2();
// const renderer = new THREE.WebGLRenderer({ antialias: true });
// renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild(renderer.domElement);
// camera.position.z = 20;



// // Attach renderer to 'my_dataviz' div
// document.getElementById('my_dataviz').appendChild(renderer.domElement);

// // You may want to add OrbitControls here so that you can navigate through the scene
// // Pass renderer.domElement as the second argument to THREE.OrbitControls
// const controls = new THREE.OrbitControls(camera, renderer.domElement);
// controls.update();

// const createOrUpdateCubeWithScene = createOrUpdateCube(scene);

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
    const ratings = await generateRatings(createOrUpdateCube); // changed this line
  
    // Display the ratings in 'llmRatings' div
    document.getElementById('llmRatings').innerText = JSON.stringify(ratings, null, 2);
});