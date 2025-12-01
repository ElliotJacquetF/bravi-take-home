import { render, screen } from "@testing-library/react";

describe("test runner setup", () => {
  it("renders a simple component", () => {
    const Greeting = () => <div>Hello Vitest</div>;
    render(<Greeting />);
    expect(screen.getByText("Hello Vitest")).toBeInTheDocument();
  });
});
