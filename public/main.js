//CLIENT
import {updateSidebar, initializeModels, initializeModelParams, initializePrompts} from './sidebar.js';
import { differentiatingTopicsGenerator } from './attributeGenerator.js';
import { listPerpetuator } from './listPerpetuator.js';
import { generateRatings, generateRange } from './ratingGenerator.js';


d3.select("#my_dataviz")
  .append("svg")
  .attr("width", 500)
  .attr("height", 500)
  .append("circle")
  .attr("cx", 250)
  .attr("cy", 250)
  .attr("r", 50)
  .attr("fill", "blue");

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

// // New event listener for 'vectorizeButton'
// document.getElementById('vectorizeButton').addEventListener('click', async () => {
//     const ratings = await generateRatings();
//     // const ratings = await generateRange();

//     // Display the ratings in 'llmRatings' div
//     document.getElementById('llmRatings').innerText = JSON.stringify(ratings, null, 2);
//     // document.getElementById('llmRatings').innerText = ratings;
// });

// Event listener for 'vectorizeButton'
document.getElementById('vectorizeButton').addEventListener('click', async () => {
    const ratings = await generateRatings();

    // Display the ratings in 'llmRatings' div
    document.getElementById('llmRatings').innerText = JSON.stringify(ratings, null, 2);

    // Show the 'PCA' button
    document.getElementById('pcaButton').style.display = 'block';
});


// PCA function
function performPCA(data) {
    // Transform your data into an array of values
    let items = Object.keys(data);
    let values = items.map(item => Object.values(data[item]));

    // Perform PCA
    let pca = new PCA(values);

    // Get the three first principal components
    let components = pca.predict(values, { nComponents: 3 });

    // Convert the result back into the original format
    let result = items.reduce((res, item, index) => {
        res[item] = {
            component1: components[index][0],
            component2: components[index][1],
            component3: components[index][2],
        };
        return res;
    }, {});

    return result;
}

// Event listener for 'PCA' button
document.getElementById('pcaButton').addEventListener('click', () => {
    // Get the ratings from 'llmRatings' div
    let ratings = JSON.parse(document.getElementById('llmRatings').innerText);

    // Perform PCA
    let pcaResult = performPCA(ratings);

    // Replace the content in 'llmRatings' div with the PCA result
    document.getElementById('llmRatings').innerText = JSON.stringify(pcaResult, null, 2);
});
