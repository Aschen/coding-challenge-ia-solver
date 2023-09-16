// ACTIONS =============================================================================

let tabId;

document
  .getElementById("solveCoding")
  .addEventListener("click", async function solveCoding() {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "answer-coding" }, (response) => {
        resolve(response);
      });
    });
  });

document
  .getElementById("solveQCM")
  .addEventListener("click", async function solveQCM() {
    const choicesSelector = document.getElementById("choicesSelector").value;

    await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "answer-qcm", selector: choicesSelector },
        (response) => {
          resolve(response);
        }
      );
    });
  });

document
  .getElementById("solveGeneric")
  .addEventListener("click", async function solveGeneric() {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "answer-generic" }, (response) => {
        resolve(response);
      });
    });
  });

const apiKeyInput = document.getElementById("apiKey");
const apiKeyStatus = document.getElementById("apiKeyStatus");

async function retrieveApiKeyFromStorage() {
  const apiKey = await new Promise((resolve) => {
    chrome.storage.sync.get("apiKey", (result) => {
      resolve(result.apiKey);
    });
  });

  if (!apiKey) {
    return;
  }

  saveApiKey(apiKey);
}
retrieveApiKeyFromStorage();

apiKeyInput.addEventListener("input", () => {
  const apiKey = apiKeyInput.value.trim();

  saveApiKey(apiKey);
});

async function saveApiKey(apiKey) {
  const apiUrl = "https://api.openai.com/v1/engines/davinci/completions";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: "Test API key validity",
        max_tokens: 5,
      }),
    });

    if (!response.ok) {
      throw new Error("Invalid API key");
    }

    if (apiKeyStatus) {
      apiKeyStatus.textContent = "Got valid API key";
      apiKeyStatus.style.color = "green";
    }

    chrome.storage.sync.set({ apiKey });
  } catch (error) {
    if (apiKeyStatus) {
      apiKeyStatus.textContent = "Invalid or no API key";
      apiKeyStatus.style.color = "red";
    }
  }
}

document.getElementById("resetApiKey").addEventListener("click", () => {
  chrome.storage.sync.remove("apiKey");
  apiKeyInput.value = "";
  apiKeyStatus.textContent = "Invalid or no API key";
  apiKeyStatus.style.color = "red";
});
