import { CallToAction } from "@/components/home/call-to-action"
import { Features } from "@/components/home/features"
import { Hero } from "@/components/home/hero"
import { HowItWorks } from "@/components/home/how-it-works"
import { Integrations } from "@/components/home/integrations"
import { Pricing } from "@/components/home/pricing"
import { Footer } from "@/components/site/footer"
import { NavBar } from "@/components/site/navbar"

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
      <Footer />
    </>
  )
}
