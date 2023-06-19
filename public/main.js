d3.select("#my_dataviz")
  .append("svg")
  .attr("width", 500)
  .attr("height", 500)
  .append("circle")
  .attr("cx", 250)
  .attr("cy", 250)
  .attr("r", 50)
  .attr("fill", "blue");

  fetch('/models')
  .then(response => response.json())
  .then(models => {
      const modelContainer = document.getElementById('modelContainer');
      models.forEach((model, index) => {
          const label = document.createElement('label');
          label.textContent = model;
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = 'model';
          input.value = model;
          if (index === 0) {
              input.checked = true;
          }
          label.appendChild(input);
          modelContainer.appendChild(label);
      });
  });
  
async function getPrompt() {
    const response = await fetch('/prompt');
    const data = await response.json();
    return data.prompt;
}

async function askGPT() {
    const userInput = document.getElementById('userInput').value;

    const prompt = await getPrompt();
    const fullPrompt = prompt.replace('<USERINPUT TOPIC>', userInput);

    const response = await fetch('/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: fullPrompt, model: selectedModel }), // include the model in the request body
    });

    const data = await response.json();
    let responseText = data.response.replace(fullPrompt, ''); // Remove the fullPrompt from the response

    responseText = responseText.trim().replace(/\[|\]|'/g, ""); // Remove brackets and quotes
    let responseList = responseText.split(","); // Split into array by comma
    responseList = responseList.map(item => item.trim()); // Remove any leading/trailing spaces in each item

    document.getElementById('gptResponse').innerText = responseList.join(", "); // Join array elements with a comma for display
}

document.getElementById('toggleSidebarButton').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

document.getElementById('askButton').addEventListener('click', askGPT);