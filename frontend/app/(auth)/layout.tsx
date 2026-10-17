import { Logo } from "@/components/site/logo"

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <Logo />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-4 pb-16 sm:px-6">
        {children}
      </main>
    </div>
  )
}

