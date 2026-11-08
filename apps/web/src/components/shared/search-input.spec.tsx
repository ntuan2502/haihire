import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SearchInput } from "./search-input";

describe("SearchInput component", () => {
  it("renders with placeholder and initial value", () => {
    render(<SearchInput placeholder="Search test..." value="initial query" />);
    const input = screen.getByPlaceholderText("Search test...") as HTMLInputElement;
    expect(input.value).toBe("initial query");
  });

  it("updates input text immediately on typing without delay", () => {
    const handleChange = vi.fn();
    render(<SearchInput placeholder="Search..." onChange={handleChange} />);
    const input = screen.getByPlaceholderText("Search...") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "developer" } });
    expect(input.value).toBe("developer");
    // Not committed yet before debounce
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("preserves trailing spaces while typing", () => {
    const handleChange = vi.fn();
    render(<SearchInput placeholder="Search..." onChange={handleChange} />);
    const input = screen.getByPlaceholderText("Search...") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "Đức " } });
    expect(input.value).toBe("Đức ");
  });

  it("debounces onChange callback", () => {
    vi.useFakeTimers();
    const handleChange = vi.fn();
    render(<SearchInput placeholder="Search..." onChange={handleChange} debounceMs={200} />);
    const input = screen.getByPlaceholderText("Search...") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "frontend engineer" } });
    expect(handleChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(handleChange).toHaveBeenCalledWith("frontend engineer");
    vi.useRealTimers();
  });

  it("commits immediately when user presses Enter", () => {
    const handleChange = vi.fn();
    render(<SearchInput placeholder="Search..." onChange={handleChange} />);
    const input = screen.getByPlaceholderText("Search...") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "quick search" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(handleChange).toHaveBeenCalledWith("quick search");
  });

  it("clears immediately when user clicks the X button", () => {
    const handleChange = vi.fn();
    render(<SearchInput placeholder="Search..." value="to be cleared" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("Search...") as HTMLInputElement;
    expect(input.value).toBe("to be cleared");

    const clearBtn = screen.getByRole("button", { name: /clear search/i });
    fireEvent.click(clearBtn);

    expect(input.value).toBe("");
    expect(handleChange).toHaveBeenCalledWith("");
  });

  it("clears when user presses Escape", () => {
    const handleChange = vi.fn();
    render(<SearchInput placeholder="Search..." value="escape me" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("Search...") as HTMLInputElement;

    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
    expect(handleChange).toHaveBeenCalledWith("");
  });
});
