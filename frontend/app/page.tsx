import { BackToHero } from "@/components/home/back-to-hero"
import { CallToAction } from "@/components/home/call-to-action"
import { Features } from "@/components/home/features"
import { Hero } from "@/components/home/hero"
import { HowItWorks } from "@/components/home/how-it-works"
import { Integrations } from "@/components/home/integrations"
import { Pricing } from "@/components/home/pricing"
import { Footer } from "@/components/site/footer"
import { NavBar } from "@/components/site/navbar"
import { SectionSpy } from "@/components/site/section-spy"

export default function Page() {
  return (
    <>
      <NavBar />
      <main className="flex-1">
        <Hero />
        <Integrations />
        <Features />
        <HowItWorks />
        <Pricing />
        <CallToAction />
      </main>
      {/* Keeps the hash tracking the section on screen, which is what keeps
          the Features / Pricing / How it works nav links clickable more than
          once — see the component for why. */}
      <SectionSpy ids={["features", "how-it-works", "pricing"]} />
      <BackToHero watchId="get-started" targetId="hero" />
      <Footer />
    </>
  )
}
