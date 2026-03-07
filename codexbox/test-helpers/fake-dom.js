"use strict";

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    for (const name of names) {
      this.values.add(name);
    }
  }

  remove(...names) {
    for (const name of names) {
      this.values.delete(name);
    }
  }

  toggle(name, force) {
    if (force === undefined) {
      if (this.values.has(name)) {
        this.values.delete(name);
        return false;
      }
      this.values.add(name);
      return true;
    }
    if (force) {
      this.values.add(name);
      return true;
    }
    this.values.delete(name);
    return false;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement {
  constructor(tagName, id = "") {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this._className = "";
    this._textContent = "";
    this.value = "";
    this.disabled = false;
    this.type = "";
    this.rows = 0;
    this.placeholder = "";
    this.title = "";
    this.scrollTop = 0;
    this.scrollHeight = 0;
  }

  set className(value) {
    this._className = String(value || "");
    this.classList = new FakeClassList();
    for (const name of this._className.split(/\s+/).filter(Boolean)) {
      this.classList.add(name);
    }
  }

  get className() {
    return Array.from(this.classList.values).join(" ");
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join("");
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  replaceChildren(...nodes) {
    this.children = [];
    this._textContent = "";
    for (const node of nodes) {
      this.appendChild(node);
    }
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(listener);
  }

  async dispatchEvent(event) {
    const listeners = this.listeners.get(event.type) || [];
    for (const listener of listeners) {
      await listener(event);
    }
  }
}

class FakeDocument {
  constructor() {
    this.nodes = new Map();
    for (const id of [
      "shell",
      "status",
      "session-id",
      "messages",
      "workspace-tree",
      "selected-path",
      "file-preview",
      "diff-view",
      "approvals",
      "user-inputs",
      "composer",
      "prompt",
      "send",
      "tab-chat",
      "tab-files",
      "tab-diff",
    ]) {
      this.nodes.set(id, new FakeElement("div", id));
    }
  }

  getElementById(id) {
    return this.nodes.get(id);
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }
}

class FakeStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(String(key));
  }
}

class FakeEventSource {
  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.closed = false;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(listener);
  }

  close() {
    this.closed = true;
  }
}

FakeEventSource.instances = [];

function findFirst(node, predicate) {
  if (predicate(node)) {
    return node;
  }
  for (const child of node.children) {
    const found = findFirst(child, predicate);
    if (found) {
      return found;
    }
  }
  return null;
}

module.exports = {
  FakeClassList,
  FakeDocument,
  FakeElement,
  FakeEventSource,
  FakeStorage,
  findFirst,
};
