import type { ProductDetailSection } from "@/features/product-detail/types";

/** A line of an ingredient list, without a leading bullet or dash the editor may have typed. */
const cleanItem = (line: string) => line.replace(/^[\s\-•*]+/, "").trim();

export function ProductDetailsSection({
  sections,
  heading = "Details",
}: {
  sections: ProductDetailSection[];
  /** "Ingredients" for fragrances: each line of a card is then a bullet. */
  heading?: "Details" | "Ingredients";
}) {
  return (
    <section aria-labelledby="product-details-heading">
      <h2
        id="product-details-heading"
        className="font-heading text-xl font-medium"
      >
        {heading}
      </h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:gap-8">
        {sections.map((section, index) => {
          // Ingredients: one bullet per line. A card with a single line stays a paragraph.
          const lines =
            heading === "Ingredients"
              ? section.body.split(/\r?\n/).map(cleanItem).filter(Boolean)
              : [];
          return (
            <article
              key={`${index}-${section.title}`}
              className="rounded-xl border border-black/10 bg-panel p-6"
            >
              <h3 className="font-heading text-base font-bold">
                {section.title}
              </h3>
              {lines.length > 1 ? (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground marker:text-foreground/60">
                  {lines.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {section.body}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
