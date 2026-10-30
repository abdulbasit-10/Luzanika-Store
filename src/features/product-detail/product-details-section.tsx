import type { ProductDetailSection } from "@/features/product-detail/types";

export function ProductDetailsSection({
  sections,
}: {
  sections: ProductDetailSection[];
}) {
  return (
    <section aria-labelledby="product-details-heading">
      <h2
        id="product-details-heading"
        className="font-heading text-xl font-medium"
      >
        Details
      </h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:gap-8">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-xl border border-black/10 bg-panel p-6"
          >
            <h3 className="font-heading text-base font-bold">
              {section.title}
            </h3>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {section.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
