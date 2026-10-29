import { siteConfig } from "@/config/site";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col items-center justify-center px-gutter py-section text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        {siteConfig.name}
      </h1>
    </main>
  );
}
