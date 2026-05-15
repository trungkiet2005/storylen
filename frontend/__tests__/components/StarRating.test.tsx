import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StarRating } from "@/components/StarRating";

describe("<StarRating />", () => {
  it("renders five star buttons in interactive mode", () => {
    render(<StarRating value={0} onChange={() => {}} />);
    const buttons = screen.getAllByRole("radio");
    expect(buttons).toHaveLength(5);
  });

  it("marks the selected star with aria-checked", () => {
    render(<StarRating value={3} onChange={() => {}} />);
    const stars = screen.getAllByRole("radio");
    expect(stars[2]).toHaveAttribute("aria-checked", "true");
    expect(stars[0]).toHaveAttribute("aria-checked", "false");
    expect(stars[4]).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange with the clicked star value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StarRating value={0} onChange={onChange} />);
    await user.click(screen.getByLabelText("4 sao"));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("clicking the active star clears the rating (toggles to 0)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StarRating value={3} onChange={onChange} />);
    await user.click(screen.getByLabelText("3 sao"));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("read-only mode renders divs with no buttons", () => {
    const { container } = render(<StarRating value={4} readOnly />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    // Should still render five star SVGs
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(5);
  });

  it("shows the clear button only when value > 0 and showClear is true", () => {
    const { rerender } = render(<StarRating value={0} onChange={() => {}} showClear />);
    expect(screen.queryByLabelText("Xoá đánh giá")).not.toBeInTheDocument();
    rerender(<StarRating value={4} onChange={() => {}} showClear />);
    expect(screen.getByLabelText("Xoá đánh giá")).toBeInTheDocument();
  });

  it("clicking the clear button emits onChange(0)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StarRating value={4} onChange={onChange} showClear />);
    await user.click(screen.getByLabelText("Xoá đánh giá"));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("stops click propagation so card link wrappers aren't triggered", async () => {
    const onChange = vi.fn();
    const parentClick = vi.fn();
    const user = userEvent.setup();
    render(
      <div onClick={parentClick}>
        <StarRating value={0} onChange={onChange} />
      </div>,
    );
    await user.click(screen.getByLabelText("3 sao"));
    expect(onChange).toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });
});
