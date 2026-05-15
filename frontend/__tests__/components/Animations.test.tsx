import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
  ScaleIn,
  HoverLift,
  AnimatedPage,
} from "@/components/Animations";

describe("Animations", () => {
  it("FadeIn renders children", () => {
    const { getByText } = render(<FadeIn><span>hello</span></FadeIn>);
    expect(getByText("hello")).toBeTruthy();
  });

  it("FadeIn accepts direction and distance props", () => {
    const { getByText } = render(
      <FadeIn direction="left" distance={40}><span>left</span></FadeIn>
    );
    expect(getByText("left")).toBeTruthy();
  });

  it("StaggerContainer renders children", () => {
    const { getByText } = render(
      <StaggerContainer><span>items</span></StaggerContainer>
    );
    expect(getByText("items")).toBeTruthy();
  });

  it("StaggerItem renders children", () => {
    const { getByText } = render(
      <StaggerContainer>
        <StaggerItem><span>item1</span></StaggerItem>
        <StaggerItem><span>item2</span></StaggerItem>
      </StaggerContainer>
    );
    expect(getByText("item1")).toBeTruthy();
    expect(getByText("item2")).toBeTruthy();
  });

  it("ScaleIn renders children", () => {
    const { getByText } = render(<ScaleIn><span>scaled</span></ScaleIn>);
    expect(getByText("scaled")).toBeTruthy();
  });

  it("HoverLift renders children", () => {
    const { getByText } = render(<HoverLift><button>hover me</button></HoverLift>);
    expect(getByText("hover me")).toBeTruthy();
  });

  it("AnimatedPage renders children", () => {
    const { getByText } = render(<AnimatedPage><main>page</main></AnimatedPage>);
    expect(getByText("page")).toBeTruthy();
  });

  it("FadeIn passes className to wrapper", () => {
    const { container } = render(<FadeIn className="my-cls"><span>x</span></FadeIn>);
    expect(container.querySelector(".my-cls")).toBeTruthy();
  });
});
