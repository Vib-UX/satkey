import { Hero } from "@/components/Hero";
import { Configurator } from "@/components/Configurator";
import { HowItWorks } from "@/components/HowItWorks";
import { MarketplacePreview } from "@/components/MarketplacePreview";

export default function Home() {
  return (
    <>
      <Hero />
      <Configurator />
      <HowItWorks />
      <MarketplacePreview />
    </>
  );
}
