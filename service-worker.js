const API_KEY = "your key";

// START DOM.JS ================================================================================================================================

const delayBetweenKeystrokes = () => Math.random() * 100;
const delayBetweenClicks = 100;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendCommand(method, params) {
  return chrome.debugger.sendCommand({ tabId: TAB_ID }, method, params);
}

async function clickAtPosition(x, y, clickCount = 1) {
  // callRPC("ripple", [x, y]);
  await sendCommand("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x,
    y,
    button: "left",
    clickCount,
  });
  await sendCommand("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x,
    y,
    button: "left",
    clickCount,
  });
  await sleep(delayBetweenClicks);
}

async function getCenterCoordinates(objectId) {
  const { model } = await sendCommand("DOM.getBoxModel", { objectId });

  const [x1, y1, x2, y2, x3, y3, x4, y4] = model.border;
  const centerX = (x1 + x3) / 2;
  const centerY = (y1 + y3) / 2;

  return { x: centerX, y: centerY };
}

async function clickOnElement(objectId, clickCount = 1) {
  const { x, y } = await getCenterCoordinates(objectId);
  await clickAtPosition(x, y, clickCount);
}

async function selectAll() {
  await sendCommand("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    windowsVirtualKeyCode: 65,
    modifiers: 2,
  });
  await sleep(delayBetweenKeystrokes());
}

async function typeDelete() {
  await sendCommand("Input.dispatchKeyEvent", {
    type: "keyDown",
    nativeVirtualKeyCode: 0x002e,
    windowsVirtualKeyCode: 0x002e,
  });
  await sleep(delayBetweenKeystrokes());
  await sendCommand("Input.dispatchKeyEvent", {
    type: "keyUp",
    nativeVirtualKeyCode: 0x002e,
    windowsVirtualKeyCode: 0x002e,
  });
  await sleep(delayBetweenKeystrokes());
}

async function selectAllLeft() {
  // left
  await sendCommand("Input.dispatchKeyEvent", {
    type: "keyDown",
    modifiers: 2 + 8,
    nativeVirtualKeyCode: 0x25,
    windowsVirtualKeyCode: 0x25,
  });
  await sleep(delayBetweenKeystrokes());

  await sendCommand("Input.dispatchKeyEvent", {
    type: "keyUp",
    modifiers: 2 + 8,
    nativeVirtualKeyCode: 0x25,
    windowsVirtualKeyCode: 0x25,
  });
  await sleep(delayBetweenKeystrokes());
}

let currentLine = "";

async function typeText(text) {
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char !== "\n") {
      currentLine += char;
    }

    if (char === "\n") {
      await sendCommand("Input.dispatchKeyEvent", {
        type: "char",
        windowsVirtualKeyCode: 13,
        unmodifiedText: "\r",
        text: "\r",
      });
      await sleep(delayBetweenKeystrokes());

      if (currentLine.startsWith(" ")) {
        // preserve indentation
        await selectAllLeft();
      }

      currentLine = "";
    } else {
      await sendCommand("Input.dispatchKeyEvent", {
        type: "keyDown",
        text: char,
      });
      await sleep(delayBetweenKeystrokes());
      await sendCommand("Input.dispatchKeyEvent", {
        type: "keyUp",
        text: char,
      });
      await sleep(delayBetweenKeystrokes());

      // remove auto added bracket or parenthesis
      if (char === "{" || char === "(") {
        await typeDelete();
      }
    }
  }
}

async function getObjectId(selector) {
  const pageDocument = await sendCommand("DOM.getDocument");

  const { nodeId } = await sendCommand("DOM.querySelector", {
    nodeId: pageDocument.root.nodeId,
    selector,
  });

  if (!nodeId) {
    throw new Error("Could not find node");
  }

  const result = await sendCommand("DOM.resolveNode", { nodeId });

  const objectId = result.object.objectId;
  if (!objectId) {
    throw new Error("Could not find object");
  }

  return objectId;
}

async function clickCodeEditor() {
  const objectId = await getObjectId(".monaco-editor");

  await clickOnElement(objectId, 3);
}

// END DOM.JS ================================================================================================================================

// START OPENAI.JS ================================================================================================================================
const API_URL = "https://api.openai.com/v1/chat/completions";

const SOLVE_CODING_PROMPT = ({ instructions, baseCode }) => `
You are a developer.

You are passing a code exercice for a job interview.
You need to solve the problem using typescript.

# Problem to solve:

${instructions}

# end of problem to solve

# Exercise base code:

${baseCode}

# end of exercise base code

You need to complete the following code to solve the problem.
Keep the base code as much as possible. Follow the instructions given in comment.

Answer only typescript code, do not explain the code or put it between backticks.
`;

const SOLVE_QCM_PROMPT = ({ question, choices }) => `
You will be given a question.

It's a multiple choice question, you will be given the choices and you need to repeat the correct choices separated by a new line as the answer.

# Question:
${question}
# end question

# Choices

${choices.join("\n")}

# end choices

Your output should only be a concise answer and nothing more.
`;

const SOLVE_GENERIC = ({ text }) => `You are a developer.

You are passing a code exercice for a job interview.

You will be given the content of the webpage containing the exercice.

# Content of the exercice

${text}

# end content of the exercice

Give a concise answer to the question asked in the exercice.
`;

async function* completion(prompt) {
  console.log(prompt);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    const raw = decoder.decode(value);

    for (const line of raw.split("\n")) {
      if (!line.startsWith("data: ")) {
        continue;
      }

      const jsonRaw = line.replace("data: ", "");

      if (jsonRaw === "[DONE]") {
        break;
      }

      const message = JSON.parse(jsonRaw);

      if (message.choices[0].delta.content) {
        yield message.choices[0].delta.content;
      }
    }
  }
}

// END OPENAI.JS ================================================================================================================================

// START WORKER ================================================================================================================================
let TAB_ID;

async function startDebugger() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  TAB_ID = tab.id;

  await new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId: TAB_ID }, "1.2", async () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Failed to attach debugger:",
          chrome.runtime.lastError.message
        );
        reject(
          new Error(
            `Failed to attach debugger: ${chrome.runtime.lastError.message}`
          )
        );
      } else {
        console.log("attached to debugger");
        await sendCommand("DOM.enable");
        await sendCommand("Runtime.enable");
        console.log("DOM and Runtime enabled");
        resolve();
      }
    });
  });
}

async function getTestBaseCode() {
  return await extractText(".view-lines");
}

async function extractText(selector) {
  const response = await chrome.tabs.sendMessage(TAB_ID, {
    type: "extract-text",
    selector,
  });

  return response.text;
}

async function answerCoding({ instructions }) {
  const baseCode = await getTestBaseCode();

  await clickCodeEditor();

  await selectAll();

  for await (const token of completion(
    SOLVE_CODING_PROMPT({ instructions, baseCode })
  )) {
    await typeText(token);
  }
}

async function answerQCM({ choices, question }) {
  let answer = "";

  for await (const token of completion(
    SOLVE_QCM_PROMPT({ choices, question })
  )) {
    answer += token;
  }

  console.log(answer);

  return answer;
}

async function answerGeneric({ text }) {
  let answer = "";

  for await (const token of completion(SOLVE_GENERIC({ text }))) {
    answer += token;
  }

  console.log(answer);

  return answer;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Worker receive message", request.type);

  switch (request.type) {
    case "start-debugger":
      startDebugger().then((tabId) => {
        console.log("send response");
        sendResponse({ type: "start", tabId });
      });
      break;

    case "answer-coding":
      startDebugger()
        .then(() => {
          return chrome.tabs.sendMessage(TAB_ID, {
            type: "pick-text",
          });
        })
        .then(({ text }) => {
          return answerCoding({ instructions: text });
        })
        .then(() => {
          sendResponse();
        });
      break;

    case "answer-qcm":
      const choicesSelector = request.selector;

      startDebugger()
        .then(() => {
          return chrome.tabs.sendMessage(TAB_ID, {
            type: "prepare-qcm",
            selector: choicesSelector,
          });
        })
        .then(({ choices, question }) => {
          return answerQCM({ choices, question });
        })
        .then((answer) => {
          return chrome.tabs.sendMessage(TAB_ID, {
            type: "log",
            message: `QCM answers are: \n${answer}`,
          });
        })
        .then(() => {
          sendResponse();
        });
      break;

    case "answer-generic":
      startDebugger()
        .then(() => {
          return chrome.tabs.sendMessage(TAB_ID, {
            type: "extract-text",
            selector: "body",
          });
        })
        .then(({ text }) => {
          return answerGeneric({ text });
        })
        .then((answer) => {
          return chrome.tabs.sendMessage(TAB_ID, {
            type: "log",
            message: answer,
          });
        })
        .then(() => {
          sendResponse();
        });
      break;

    default:
      console.log(`Unknown message type ${request.type}`);
      break;
  }

  return true;
});
