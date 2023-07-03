// A function to clean the GPT response text by removing the full prompt, replacing unwanted characters and splitting it into an array of strings
export const cleanResponse = (responseText, fullPrompt) => {
    let cleanText = responseText.replace(fullPrompt, '').trim().split("\n")[0];
    cleanText = cleanText.replace(/\[|\]|'/g, "").replace(/[^\w\s,-]/g, "");
    return cleanText.split(",").map(item => item.trim());
  };
  
  // A function to combine two lists, convert all items to lower case, remove duplicates and empty strings
  export const combineAndCleanList = (initialList, expandedList) => {
      // Combining the initial and expanded lists
      let combinedList = [...initialList, ...expandedList];
      
      // Converting all items to lower case
      combinedList = combinedList.map(item => item.toLowerCase());
      combinedList = [...new Set(combinedList)];
      return combinedList.filter(item => item !== '');
  };
  