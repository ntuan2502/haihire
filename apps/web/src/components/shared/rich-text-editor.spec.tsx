import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { RichTextEditor } from "./rich-text-editor";

vi.mock("@/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe("RichTextEditor", () => {
  const emptyRect = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect;

  const createEmptyRectList = () =>
    Object.assign([] as DOMRect[], {
      item: () => null,
    }) as unknown as DOMRectList;

  const origRangeGetClientRects = Range.prototype.getClientRects;
  const origRangeGetBoundingClientRect = Range.prototype.getBoundingClientRect;
  const origElGetClientRects = Element.prototype.getClientRects;

  beforeAll(() => {
    if (!Range.prototype.getClientRects) {
      Range.prototype.getClientRects = () => createEmptyRectList();
    }
    if (!Range.prototype.getBoundingClientRect) {
      Range.prototype.getBoundingClientRect = () => emptyRect;
    }
    if (!Element.prototype.getClientRects) {
      Element.prototype.getClientRects = () => createEmptyRectList();
    }
  });

  afterAll(() => {
    Range.prototype.getClientRects = origRangeGetClientRects;
    Range.prototype.getBoundingClientRect = origRangeGetBoundingClientRect;
    Element.prototype.getClientRects = origElGetClientRects;
  });

  it("preserves legacy plain-text paragraphs and line breaks when loaded", async () => {
    const legacyPlainText =
      "First line\nSecond line\n\n- Bullet item <exact> & more";

    const { container, unmount } = render(
      <RichTextEditor
        value={legacyPlainText}
        onChange={vi.fn()}
        ariaLabel="Job description editor"
      />,
    );

    await waitFor(() => {
      const paragraphs = container.querySelectorAll(".tiptap p");
      expect(paragraphs).toHaveLength(2);
    });

    const paragraphs = container.querySelectorAll(".tiptap p");
    expect(paragraphs[0].innerHTML).toContain("First line");
    expect(paragraphs[0].innerHTML).toContain("<br");
    expect(paragraphs[0].innerHTML).toContain("Second line");
    expect(paragraphs[1].textContent).toBe("- Bullet item <exact> & more");
    unmount();
  });

  it("updates toolbar active state on editor transactions", async () => {
    const { unmount } = render(
      <RichTextEditor
        value="<p>Initial content</p>"
        onChange={vi.fn()}
        ariaLabel="Job description editor"
      />,
    );

    const h2Btn = screen.getByRole("button", {
      name: "jobs.wizard.editor.heading2",
    });

    await waitFor(() => {
      expect(document.querySelector(".tiptap p")).not.toBeNull();
    });

    expect(h2Btn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(h2Btn);

    await waitFor(() => {
      expect(h2Btn).toHaveAttribute("aria-pressed", "true");
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    unmount();
  });

  it("opens shadcn link popover, rejects unsafe URLs, and applies valid links without window.prompt", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockImplementation(() => null);
    const onChange = vi.fn();

    const { unmount } = render(
      <RichTextEditor
        value="<p>Initial content</p>"
        onChange={onChange}
        ariaLabel="Job description editor"
      />,
    );

    await waitFor(() => {
      expect(document.querySelector(".tiptap p")).not.toBeNull();
    });

    const linkBtn = screen.getByRole("button", {
      name: "jobs.wizard.editor.link",
    });
    fireEvent.click(linkBtn);

    const urlInput = await screen.findByPlaceholderText(
      "jobs.wizard.editor.linkPlaceholder",
    );
    expect(promptSpy).not.toHaveBeenCalled();

    fireEvent.change(urlInput, { target: { value: "javascript:alert(1)" } });
    fireEvent.click(
      screen.getByRole("button", { name: "jobs.wizard.editor.linkApply" }),
    );

    expect(
      screen.getByText("jobs.wizard.editor.linkInvalidUrl"),
    ).toBeInTheDocument();

    fireEvent.change(urlInput, { target: { value: "https://haihire.com" } });
    fireEvent.click(
      screen.getByRole("button", { name: "jobs.wizard.editor.linkApply" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("jobs.wizard.editor.linkPlaceholder"),
      ).not.toBeInTheDocument();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    promptSpy.mockRestore();
    unmount();
  });
});
