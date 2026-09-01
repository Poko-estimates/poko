import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Container } from "@/components/site/container"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function CallToAction() {
  return (
    <section className="bg-background py-20 sm:py-24">
      <Container>
        <div className="relative isolate overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center sm:px-16">
            <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl leading-tight font-semibold tracking-tight text-white text-balance sm:text-4xl">
              Your next refinement doesn&apos;t have to run long
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/70">
              Set up a room in under a minute and point your first story before
              the meeting invite even lands.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "xl" }),
                  "justify-center"
                )}
              >
                Create your free room
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export { CallToAction }
