import { useState } from "react";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BottomSheet } from "./ui-kit";

function Example() {
  const [open, setOpen] = useState(false);
  return <div data-testid="page"><button onClick={() => setOpen(true)}>Abrir lista</button>
    <BottomSheet open={open} onClose={() => setOpen(false)} title="Indicadores">
      <input aria-label="Busca" /><p>Conteúdo da lista</p>
    </BottomSheet>
  </div>;
}

afterEach(cleanup);

describe("Bottom sheet scrolling", () => {
  it("portals outside the page and separates the fixed header from native scroll content", () => {
    render(<Example />);
    fireEvent.click(screen.getByText("Abrir lista"));
    const dialog = screen.getByRole("dialog", { name: "Indicadores" });
    const scroll = screen.getByTestId("sheet-scroll");
    expect(screen.getByTestId("page")).not.toContainElement(dialog);
    expect(dialog).toContainElement(scroll);
    expect(scroll).toHaveClass("overflow-y-auto", "touch-pan-y", "overscroll-y-contain", "min-h-0");
    expect(scroll).not.toContainElement(screen.getByRole("button", { name: "Fechar" }));
    expect(scroll.style.touchAction).not.toBe("none");
  });

  it("closes accessibly and restores the trigger focus without moving the page", async () => {
    render(<Example />);
    const trigger = screen.getByText("Abrir lista");
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Radix restores focus after its close lifecycle.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(trigger).toHaveFocus();
  });
});