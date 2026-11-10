// Link record: add a record made elsewhere, such as with the CLI. The id works as the
// record's password, so once linked it is only ever shown shortened.
import { button, el } from "./dom";
import { isRecallId } from "./recall-logic";

export const maskRecallId = (id: string): string => `${id.slice(0, 4)}…${id.slice(-4)}`;

export interface RecallFieldHost {
  linked(): string;
  /** Saves the id, or "" to unlink. Resolves to the line to show, or throws with it. */
  save(value: string): Promise<string>;
  layout(): void;
}

export function createRecallField(host: RecallFieldHost): { node: HTMLElement; refresh(): void } {
  const node = el("div", "field recall-field");
  const body = el("div", "recall-body");
  const note = el("p", "note");
  node.append(el("span", "field-label", "Link record"), body, note);
  let editing = false;

  async function save(value: string): Promise<void> {
    if (value && !isRecallId(value)) {
      note.textContent = "That isn't a valid Recall ID.";
      host.layout();
      return;
    }
    try {
      note.textContent = await host.save(value);
      editing = false;
    } catch (error) {
      note.textContent = String((error as Error)?.message ?? error);
    }
    refresh();
  }

  function editor(linked: boolean): HTMLElement {
    const input = el("input", "input recall-input");
    input.type = "text";
    input.placeholder = "Recall ID";
    input.spellcheck = false;
    input.autocomplete = "off";
    const row = el("div", "recall-row");
    row.append(
      input,
      button("Save", "button small", () => void save(input.value.trim())),
    );
    if (linked)
      row.append(
        button("Cancel", "button small", () => {
          editing = false;
          refresh();
        }),
      );
    return row;
  }

  /** Draws the field. Never lays out on the first draw: the card may still be being built. */
  function draw(): void {
    const linked = host.linked();
    if (linked && !editing) {
      const row = el("div", "recall-row recall-linked");
      row.append(
        el("span", "recall-status", `Linked · ${maskRecallId(linked)}`),
        button("Change", "button small", () => {
          editing = true;
          note.textContent = "";
          refresh();
        }),
        button("Clear", "button small", () => void save("")),
      );
      body.replaceChildren(row);
    } else {
      body.replaceChildren(editor(Boolean(linked)));
    }
  }

  function refresh(): void {
    draw();
    host.layout();
  }

  draw();
  return { node, refresh };
}
