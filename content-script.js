// START OF PICK-DOM-ELEMENT CODE
class ElementOverlay {
  constructor(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    this.overlay = document.createElement("div");
    this.overlay.className = options.className || "_ext-element-overlay";
    this.overlay.style.background =
      ((_a = options.style) === null || _a === void 0
        ? void 0
        : _a.background) || "rgba(250, 240, 202, 0.2)";
    this.overlay.style.borderColor =
      ((_b = options.style) === null || _b === void 0
        ? void 0
        : _b.borderColor) || "#F95738";
    this.overlay.style.borderStyle =
      ((_c = options.style) === null || _c === void 0
        ? void 0
        : _c.borderStyle) || "solid";
    this.overlay.style.borderRadius =
      ((_d = options.style) === null || _d === void 0
        ? void 0
        : _d.borderRadius) || "1px";
    this.overlay.style.borderWidth =
      ((_e = options.style) === null || _e === void 0
        ? void 0
        : _e.borderWidth) || "1px";
    this.overlay.style.boxSizing =
      ((_f = options.style) === null || _f === void 0
        ? void 0
        : _f.boxSizing) || "border-box";
    this.overlay.style.cursor =
      ((_g = options.style) === null || _g === void 0 ? void 0 : _g.cursor) ||
      "crosshair";
    this.overlay.style.position =
      ((_h = options.style) === null || _h === void 0 ? void 0 : _h.position) ||
      "absolute";
    this.overlay.style.zIndex =
      ((_j = options.style) === null || _j === void 0 ? void 0 : _j.zIndex) ||
      "2147483647";
    this.shadowContainer = document.createElement("div");
    this.shadowContainer.className = "_ext-element-overlay-container";
    this.shadowContainer.style.position = "absolute";
    this.shadowContainer.style.top = "0px";
    this.shadowContainer.style.left = "0px";
    this.shadowRoot = this.shadowContainer.attachShadow({ mode: "open" });
  }
  addToDOM(parent, useShadowDOM) {
    this.usingShadowDOM = useShadowDOM;
    if (useShadowDOM) {
      parent.insertBefore(this.shadowContainer, parent.firstChild);
      this.shadowRoot.appendChild(this.overlay);
    } else {
      parent.appendChild(this.overlay);
    }
  }
  removeFromDOM() {
    this.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    this.overlay.remove();
    if (this.usingShadowDOM) {
      this.shadowContainer.remove();
    }
  }
  captureCursor() {
    this.overlay.style.pointerEvents = "auto";
  }
  ignoreCursor() {
    this.overlay.style.pointerEvents = "none";
  }
  setBounds({ x, y, width, height }) {
    this.overlay.style.left = x + "px";
    this.overlay.style.top = y + "px";
    this.overlay.style.width = width + "px";
    this.overlay.style.height = height + "px";
  }
}

class ElementPicker {
  constructor(overlayOptions) {
    this.handleMouseMove = (event) => {
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
    };
    this.handleClick = (event) => {
      var _a;
      if (
        this.target &&
        ((_a = this.options) === null || _a === void 0 ? void 0 : _a.onClick)
      ) {
        this.options.onClick(this.target);
      }
      event.preventDefault();
    };
    this.tick = () => {
      this.updateTarget();
      this.tickReq = window.requestAnimationFrame(this.tick);
    };
    this.active = false;
    this.overlay = new ElementOverlay(
      overlayOptions !== null && overlayOptions !== void 0 ? overlayOptions : {}
    );
  }
  start(options) {
    var _a, _b;
    if (this.active) {
      return false;
    }
    this.active = true;
    this.options = options;
    document.addEventListener("mousemove", this.handleMouseMove, true);
    document.addEventListener("click", this.handleClick, true);
    this.overlay.addToDOM(
      (_a = options.parentElement) !== null && _a !== void 0
        ? _a
        : document.body,
      (_b = options.useShadowDOM) !== null && _b !== void 0 ? _b : true
    );
    this.tick();
    return true;
  }
  stop() {
    this.active = false;
    this.options = undefined;
    document.removeEventListener("mousemove", this.handleMouseMove, true);
    document.removeEventListener("click", this.handleClick, true);
    this.overlay.removeFromDOM();
    this.target = undefined;
    this.mouseX = undefined;
    this.mouseY = undefined;
    if (this.tickReq) {
      window.cancelAnimationFrame(this.tickReq);
    }
  }
  updateTarget() {
    var _a, _b;
    if (this.mouseX === undefined || this.mouseY === undefined) {
      return;
    }
    // Peek through the overlay to find the new target
    this.overlay.ignoreCursor();
    const elAtCursor = document.elementFromPoint(this.mouseX, this.mouseY);
    const newTarget = elAtCursor;
    this.overlay.captureCursor();
    // If the target hasn't changed, there's nothing to do
    if (!newTarget || newTarget === this.target) {
      return;
    }
    // If we have an element filter and the new target doesn't match,
    // clear out the target
    if (
      (_a = this.options) === null || _a === void 0 ? void 0 : _a.elementFilter
    ) {
      if (!this.options.elementFilter(newTarget)) {
        this.target = undefined;
        this.overlay.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        return;
      }
    }
    this.target = newTarget;
    const bounds = getElementBounds(newTarget);
    this.overlay.setBounds(bounds);
    if ((_b = this.options) === null || _b === void 0 ? void 0 : _b.onHover) {
      this.options.onHover(newTarget);
    }
  }
}

function getElementBounds(el) {
  const rect = el.getBoundingClientRect();
  return {
    x: window.pageXOffset + rect.left,
    y: window.pageYOffset + rect.top,
    width: el.offsetWidth,
    height: el.offsetHeight,
  };
}

const PICKER = new ElementPicker();

function startPicker() {
  return new Promise((resolve) => {
    PICKER.start({
      onClick: (el) => {
        console.log("click", el);
        resolve({ text: el.innerText });
        PICKER.stop();
      },
    });
  });
}

// END OF PICK-DOM-ELEMENT CODE

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case "extract-text":
      const element = document.querySelector(request.selector);
      sendResponse({ text: element.innerText });
      break;

    case "prepare-qcm":
      startPicker(sendResponse).then((response) => {
        const elements = document.querySelectorAll(request.selector);
        const choices = [];
        for (const element of elements) {
          choices.push(element.innerText);
        }
        sendResponse({ choices, question: response.text });
      });
      break;

    case "pick-text":
      startPicker(sendResponse).then((response) => {
        sendResponse({ text: response.text });
      });
      break;

    case "log":
      console.log(request.message);
      break;

    default:
      console.log("Unknown message type", request.type);
      break;
  }

  return true;
});
