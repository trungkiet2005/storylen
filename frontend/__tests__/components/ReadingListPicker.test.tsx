import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReadingListPicker } from "@/components/ReadingListPicker";

describe("<ReadingListPicker />", () => {
  it("shows the placeholder label when nothing is selected", () => {
    render(<ReadingListPicker value={null} onChange={() => {}} />);
    expect(screen.getByText("Thêm vào danh sách")).toBeInTheDocument();
  });

  it("shows the current label when a status is selected", () => {
    render(<ReadingListPicker value="reading" onChange={() => {}} />);
    expect(screen.getByText("Đang đọc")).toBeInTheDocument();
  });

  it("opens the dropdown on click and lists all four statuses", async () => {
    const user = userEvent.setup();
    render(<ReadingListPicker value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("button"));
    const listbox = await screen.findByRole("listbox");
    expect(listbox).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(4);
    expect(options.map(o => o.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Đang đọc"),
        expect.stringContaining("Muốn đọc"),
        expect.stringContaining("Đã xong"),
        expect.stringContaining("Bỏ dở"),
      ]),
    );
  });

  it("calls onChange with the chosen status", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ReadingListPicker value={null} onChange={onChange} />);
    await user.click(screen.getByRole("button"));
    // Click the "Đã xong" option
    const done = (await screen.findAllByRole("option")).find(o => o.textContent?.includes("Đã xong"));
    expect(done).toBeDefined();
    await user.click(done!);
    expect(onChange).toHaveBeenCalledWith("done");
  });

  it("clicking the currently-selected option clears it (null)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ReadingListPicker value="reading" onChange={onChange} />);
    await user.click(screen.getByRole("button"));
    const reading = (await screen.findAllByRole("option")).find(o => o.textContent?.includes("Đang đọc"));
    await user.click(reading!);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("does not show 'Bỏ khỏi danh sách' when no value is set", async () => {
    const user = userEvent.setup();
    render(<ReadingListPicker value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    expect(screen.queryByText(/Bỏ khỏi danh sách/i)).not.toBeInTheDocument();
  });

  it("'Bỏ khỏi danh sách' appears and clears the value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ReadingListPicker value="reading" onChange={onChange} />);
    await user.click(screen.getByRole("button"));
    const removeBtn = await screen.findByText(/Bỏ khỏi danh sách/i);
    await user.click(removeBtn);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("closes on outside click", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ReadingListPicker value={null} onChange={() => {}} />
        <button>outside</button>
      </div>,
    );
    await user.click(screen.getByText("Thêm vào danh sách"));
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    await user.click(screen.getByText("outside"));
    // framer-motion runs an exit animation; wait for the node to actually leave the DOM
    await waitFor(
      () => expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
      { timeout: 1500 },
    );
  });
});
