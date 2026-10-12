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
  'PASS: browser storage failure preserves the private draft and reports truthful save/clear status. Code-level privacy simulation.',
);
