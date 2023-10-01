let llmListResponse = "";
let llmTopicAttributes = "";

// Function to update llmListResponse
export const setLLMListResponse = (data) => {
    llmListResponse = data;
};

// Function to retrieve llmListResponse
export const getLLMListResponse = () => {
    return llmListResponse;
};

// Function to update llmTopicAttributes
export const setLLMTopicAttributes = (data) => {
    llmTopicAttributes = data;
};

// // Function to retrieve llmTopicAttributes
// export const getLLMTopicAttributes = () => {
//     return llmTopicAttributes;
// };

export const getLLMTopicAttributes = () => {
    if (typeof llmTopicAttributes === 'string') {
        return llmTopicAttributes;
    } else {
        console.error('llmTopicAttributes is not a string:', llmTopicAttributes);
        return '';
    }
};