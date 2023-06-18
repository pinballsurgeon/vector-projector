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
    document.getElementById('gptResponse').innerText = data.response;
}

document.getElementById('askButton').addEventListener('click', askGPT);
