import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const script = (file) =>
  ts.transpile(
    readFileSync(file, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],
    { target: ts.ScriptTarget.ES2022 },
  );
const throwingStorage = {
  getItem() {
    throw new Error('blocked');
  },
  setItem() {
    throw new Error('blocked');
  },
  removeItem() {
    throw new Error('blocked');
  },
};
const callbacks = {};
let focused = false;
const button = {
  classList: { add() {} },
  addEventListener: (event, fn) => (callbacks[event] = fn),
};
const root = {
  dataset: {},
  style: { setProperty: (key, value) => (root[key] = value) },
};
const banner = {
  dataset: { storageKey: 'synthetic:spacefast-dismissed' },
  hidden: false,
  getBoundingClientRect: () => ({ height: 61 }),
  querySelector: () => button,
};
let editing = false;
const visualViewport = {
  height: 844,
  addEventListener: (event, fn) => (callbacks['viewport-' + event] = fn),
};
const document = {
  documentElement: root,
  activeElement: { matches: () => editing },
  querySelector: (selector) =>
    selector === '#hosting-banner' ? banner : { focus: () => (focused = true) },
  addEventListener: (event, fn) => (callbacks[event] = fn),
};
vm.runInNewContext(script('src/components/HostingBanner.astro'), {
  document,
  window: { visualViewport, innerHeight: 844 },
  ResizeObserver: class {
    observe() {}
  },
  localStorage: throwingStorage,
});
assert.equal(root['--host-height'], '61px');
editing = true;
visualViewport.height = 300;
callbacks['viewport-resize']();
assert.equal(banner.hidden, true);
assert.equal(root['--host-height'], '0px');
editing = false;
callbacks.focusout();
assert.equal(banner.hidden, false);
callbacks.click();
assert.equal(banner.hidden, true);
assert.equal(root['--host-height'], '0px');
assert.equal(focused, true);
const name = { value: 'Synthetic name', focus() {} },
  message = { value: 'Synthetic private draft' },
  status = { textContent: '' };
const formEvents = {},
  clearEvents = {};
const clear = { addEventListener: (event, fn) => (clearEvents[event] = fn) };
const form = {
  classList: { add() {} },
  dataset: { draftKey: 'synthetic:draft' },
  querySelector: (sel) =>
    sel === 'input'
      ? name
      : sel === 'textarea'
        ? message
        : sel === '[role=status]'
          ? status
          : clear,
  addEventListener: (event, fn) => (formEvents[event] = fn),
};
vm.runInNewContext(script('src/pages/guestbook.astro'), {
  document: { querySelector: () => form },
  localStorage: throwingStorage,
});
assert.match(status.textContent, /unavailable/);
formEvents.submit({ preventDefault() {} });
assert.match(status.textContent, /Could not save/);
assert.equal(message.value, 'Synthetic private draft');
clearEvents.click();
assert.match(status.textContent, /unchanged/);
assert.equal(message.value, 'Synthetic private draft');
console.log(
  'PASS: blocked-storage close and focus recovery; keyboard-viewport hide/restore; draft failure preserves text and truthful status. Code-level simulation, not hardware keyboard verification.',
);
