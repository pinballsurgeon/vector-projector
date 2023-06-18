d3.select("#my_dataviz")
  .append("svg")
  .attr("width", 500)
  .attr("height", 500)
  .append("circle")
  .attr("cx", 250)
  .attr("cy", 250)
  .attr("r", 50)
  .attr("fill", "blue");

async function askGPT() {
    const userInput = document.getElementById('userInput').value;

    const response = await fetch('/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userInput }),
    });

    const data = await response.json();
    let responseText = data.response.replace(userInput, ''); // Remove the userInput from the response

    // Preprocessing the responseText into a list
    responseText = responseText.trim().replace(/\[|\]|'/g, ""); // Remove brackets and quotes
    let responseList = responseText.split(","); // Split into array by comma
    responseList = responseList.map(item => item.trim()); // Remove any leading/trailing spaces in each item

    document.getElementById('gptResponse').innerText = responseList.join(", "); // Join array elements with a comma for display
}

document.getElementById('askButton').addEventListener('click', askGPT);
