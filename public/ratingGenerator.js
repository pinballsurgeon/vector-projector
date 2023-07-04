import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';
import { fetchListFromLLM } from './llmService.js';

export const generateRatings = async () => {
  try {
    const items = document.getElementById('llmListResponse').innerText.split(', ');
    const attributes = document.getElementById('llmTopicAttributes').innerText.split(', ');

    let ratings = {};

    for (let item of items) {
      ratings[item] = {};

      for (let attribute of attributes) {
        const promptKey = "rateAttribute";  // You would need to define this prompt in your listPrompts
        const userInput = `${item} ${attribute}`;
        appendLog(`Generating rating for: ${userInput}`);

        const rating = await fetchListFromLLM(promptKey, userInput);

        // Assuming LLM returns a list of one item being the numerical rating. Parse to integer and store it.
        ratings[item][attribute] = parseInt(rating[0]);
      }
    }

    appendLog(`Ratings: ${JSON.stringify(ratings)}`);
    return ratings;

  } catch (error) {
    appendLog(`Error in rating generator: ${error}`);
  }
};
