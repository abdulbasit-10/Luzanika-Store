import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProductDetailsSection } from "./product-details-section";

const render = (props: Parameters<typeof ProductDetailsSection>[0]) =>
  renderToStaticMarkup(createElement(ProductDetailsSection, props));

describe("ProductDetailsSection", () => {
  it("shows the text of a normal product as paragraphs under 'Details'", () => {
    const html = render({
      sections: [{ title: "Material", body: "Soft cashmere.\nSecond line." }],
    });
    expect(html).toContain(">Details<");
    expect(html).toContain("<p");
    expect(html).not.toContain("<li");
  });

  it("turns each line of an ingredients card into a bullet under 'Ingredients'", () => {
    const html = render({
      heading: "Ingredients",
      sections: [
        {
          title: "This fragrance contains:",
          body: "Alcohol Denat\n- Parfum (Fragrance)\r\n• Aqua (Water)\n\nLinalool",
        },
        {
          title: "This fragrance contains:",
          body: "Limonene\nCoumarin",
        },
      ],
    });
    expect(html).toContain(">Ingredients<");
    expect(html.match(/<li/g)).toHaveLength(6);
    expect(html).toContain(">Parfum (Fragrance)<");
    expect(html).toContain(">Aqua (Water)<");
    // Two cards with the same title are both shown.
    expect(html.match(/This fragrance contains:/g)).toHaveLength(2);
  });

  it("keeps a single-line card as a paragraph, not one lonely bullet", () => {
    const html = render({
      heading: "Ingredients",
      sections: [{ title: "Description", body: "A warm, smoky scent." }],
    });
    expect(html).toContain("A warm, smoky scent.");
    expect(html).not.toContain("<li");
  });
});
