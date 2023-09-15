# Codingame Solver

This extension can be used to pass Codingame exercise automatically.

Just clone the repository and then put your own OpenAI API key at the beginning of [service-worker.js]().

[![Watch the video](assets/image.png)](assets/codingame-solver.mp4)

## Why?

From my point of view, asking for algorithms that have no relation to the real problems encountered in the professional environment has never been an effective method of evaluating a candidate.

This is even less the case since the arrival of LLMs like GPT-4, if these tools are capable of solving these problems for us then shouldn't we focus on higher level problems and let them do their thing?

It's as if a lax firm took a multiple choice test on knowledge of the penal code for a position as a prosecutor for a trial. Not very relevant.

## How it works

This is a Chrome extension with the usual 3 parts communicating with each other:

- extension popup active when clicked
- service worker running in the background
- content script injected on the webpage

### Test exercise solving

The extensions use the Chrome DevTools protocol to simulate user input in the text editor.

When the button is clicked:

- call the worker
- start debugger
- call the content script to start an element picker to select the instructions (Codingame randomize css class and IDs)
- use GPT-4 to stream code answer
- input key by key the answer (harder than you think, look at [typeText]())

### QCM solving

Roughly the same kind of workflow with the element picker but then the answer is simply displayed in the console.

### Generic question

Take the entire text body and try to find an answer to any question inside, then write the result in the console.

## Naming

"Jaime la nature" was the name of the Chrome extension to cheat at the informatic cultur exam at Epitech. This exam was a huge QCM so either you had edeitic memory or like 80% of the student you have cheat to succeed (but don't get caught!).
