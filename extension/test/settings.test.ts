// The card's settings section and the Link record field. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const { window } = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, { document: window.document });
const { createSettingsSection, OFFLINE_TEXT } = await import("../src/settings-view");
const { createRecallField, maskRecallId } = await import("../src/recall-field");

const ID = "208c1234-5678-4abc-9def-0123456ffb9f";
const node = (text: string): HTMLElement => {
  const element = window.document.createElement("div");
  element.textContent = text;
  return element;
};

function section() {
  const parts = {
    version: "0.16.3",
    scanAgain: node("Scan this page again"),
    wallet: node("Wallet: Slush 0x8e0e…bb6a · Disconnect"),
    developer: [
      node("Show debug info"),
      node("Link record"),
      node("Show welcome again"),
      node("Reset first-run bubble"),
      node("Proxy: online"),
    ],
  };
  return { ...createSettingsSection(parts), parts };
}

const visibleTop = (root: HTMLElement): string[] =>
  [...root.children]
    .filter((child) => !(child as HTMLElement).hidden && child.tagName !== "SUMMARY")
    .map((child) =>
      child.tagName === "DETAILS" ? (child.querySelector("summary")?.textContent ?? "") : (child.textContent ?? ""),
    );

test("settings shows only Scan again, the wallet line and a Developer link", () => {
  const { root } = section();
  assert.deepEqual(visibleTop(root), ["Scan this page again", "Wallet: Slush 0x8e0e…bb6a · Disconnect", "Developer"]);
  assert.equal(root.querySelector("summary")!.textContent, "settings0.16.3");
});

test("Developer holds debug info, Link record, the replays and the proxy status, closed by default", () => {
  const { developer, parts } = section();
  assert.equal(developer.open, false);
  const body = developer.querySelector(".developer-body")!;
  for (const part of parts.developer) assert.equal(part.parentElement, body);
  assert.deepEqual(
    [...body.children].map((child) => child.textContent),
    ["Show debug info", "Link record", "Show welcome again", "Reset first-run bubble", "Proxy: online"],
  );
});

test("the proxy status shows outside Developer only when Soothia can't be reached", () => {
  const { root, setOnline } = section();
  const offline = root.querySelector<HTMLElement>(".settings-offline")!;
  assert.equal(offline.parentElement, root);
  assert.equal(offline.hidden, true);
  setOnline(false);
  assert.equal(offline.hidden, false);
  assert.equal(offline.textContent, OFFLINE_TEXT);
  assert.equal(OFFLINE_TEXT, "Can't reach Soothia right now.");
  setOnline(null);
  assert.equal(offline.hidden, true);
  setOnline(false);
  setOnline(true);
  assert.equal(offline.hidden, true);
});

function recallField(linked = "") {
  let current = linked;
  const saved: string[] = [];
  const field = createRecallField({
    linked: () => current,
    save: async (value) => {
      saved.push(value);
      current = value;
      return value ? "Record linked." : "Record unlinked.";
    },
    layout: () => undefined,
  });
  const named = (label: string) =>
    [...field.node.querySelectorAll("button")].find((button) => button.textContent === label);
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  return { field, saved, named, tick, set: (value: string) => (current = value) };
}

test("a linked record shows only its first and last four characters, with Change and Clear", () => {
  const { field, named } = recallField(ID);
  assert.equal(field.node.querySelector(".recall-status")!.textContent, "Linked · 208c…fb9f");
  assert.ok(named("Change"));
  assert.ok(named("Clear"));
  assert.equal(field.node.querySelector("input"), null);
  assert.equal(field.node.textContent!.includes(ID), false);
  assert.equal(maskRecallId(ID), "208c…fb9f");
});

test("the field shows the saved id even when it arrives after the field was built", () => {
  // The settings field is made before the card is on the page, then the stored id loads.
  const { field, set } = recallField("");
  assert.ok(field.node.querySelector("input"));
  set(ID);
  field.refresh();
  assert.equal(field.node.querySelector(".recall-status")!.textContent, "Linked · 208c…fb9f");
});

test("Change opens an empty box, never the full id, and Cancel goes back", () => {
  const { field, named } = recallField(ID);
  named("Change")!.click();
  const input = field.node.querySelector("input")!;
  assert.equal(input.value, "");
  assert.equal(input.placeholder, "Recall ID");
  named("Cancel")!.click();
  assert.ok(named("Change"));
});

test("unlinked, the field takes a Recall ID; a bad one is refused and Clear unlinks", async () => {
  const empty = recallField("");
  const input = empty.field.node.querySelector("input")!;
  input.value = "not-an-id";
  empty.named("Save")!.click();
  await empty.tick();
  assert.deepEqual(empty.saved, []);
  assert.match(empty.field.node.textContent!, /isn't a valid Recall ID/);
  input.value = ID;
  empty.named("Save")!.click();
  await empty.tick();
  assert.deepEqual(empty.saved, [ID]);
  assert.match(empty.field.node.textContent!, /Linked · 208c…fb9f/);

  empty.named("Clear")!.click();
  await empty.tick();
  assert.deepEqual(empty.saved, [ID, ""]);
  assert.ok(empty.field.node.querySelector("input"));
});
