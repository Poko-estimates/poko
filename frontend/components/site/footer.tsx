import Link from "next/link"

import { Container } from "@/components/site/container"
import { Logo } from "@/components/site/logo"

const productLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Integrations", href: "/integrations" },
  { label: "Changelog", href: "/changelog" },
]

const legalLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
]

function Footer() {
  return (
    <footer className="bg-primary text-white">
      <Container className="py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div className="max-w-sm">
            <Logo tone="light" />
            <p className="mt-5 leading-relaxed text-white/60">
              Planning poker that keeps estimation honest, fast and tied to the
              backlog your team already works from.
            </p>
          </div>

          {/* One group of links, so it reads better as a row than a lone column. */}
          <nav aria-labelledby="footer-product">
            <h2 id="footer-product" className="sr-only">
              Product
            </h2>
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="rounded-sm text-sm font-medium text-white/60 transition-colors outline-none hover:text-secondary focus-visible:ring-3 focus-visible:ring-secondary/50"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} Poko. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="rounded-sm text-sm text-white/50 transition-colors outline-none hover:text-secondary focus-visible:ring-3 focus-visible:ring-secondary/50"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  )
}

export { Footer }
