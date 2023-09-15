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
