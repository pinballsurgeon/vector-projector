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
        appendLog(`Generating rating for item: ${item}, attribute: ${attribute}`);

        const replacements = { item, attribute };
        const rating = await fetchListFromLLM(promptKey, '', replacements);  // Removed userInput

        appendLog(`Generated rating: ${rating}`);

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
