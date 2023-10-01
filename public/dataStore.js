// dataStore.js
let llmListResponseData = null;
let llmTopicAttributesData = null;

function setLLMListResponse(data) {
    llmListResponseData = data;
}

function getLLMListResponse() {
    return llmListResponseData;
}

function setLLMTopicAttributes(data) {
    llmTopicAttributesData = data;
}

function getLLMTopicAttributes() {
    return llmTopicAttributesData;
}

module.exports = {
    setLLMListResponse,
    getLLMListResponse,
    setLLMTopicAttributes,
    getLLMTopicAttributes
};
