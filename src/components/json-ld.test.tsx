import { render } from "@testing-library/react";
import { expect, test } from "vitest";

import { JsonLd } from "./json-ld";

test("emits a structured data block", () => {
  const { container } = render(<JsonLd data={{ "@type": "Thing" }} />);
  const script = container.querySelector("script");

  expect(script).toHaveAttribute("type", "application/ld+json");
  expect(JSON.parse(script?.textContent ?? "")).toEqual({ "@type": "Thing" });
});

// The payload carries station names that originate in the API. An unescaped
// "</script>" inside a JSON-LD block closes the element early and whatever
// follows is parsed as markup.
test("escapes markup so a value cannot close the script element", () => {
  const { container } = render(
    <JsonLd data={{ name: "</script><img onerror=alert(1)>" }} />,
  );
  const html = container.querySelector("script")?.innerHTML ?? "";

  expect(html).not.toContain("</script>");
  expect(html).toContain("\\u003c");
  expect(container.querySelector("img")).toBeNull();
});
