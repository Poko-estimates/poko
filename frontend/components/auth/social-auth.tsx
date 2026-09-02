import { GitHubIcon, GoogleIcon } from "@/components/auth/provider-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Intent = "signin" | "signup"

const verbs: Record<Intent, string> = {
  signin: "Sign in",
  signup: "Sign up",
}

function SocialAuth({
  intent,
  className,
}: {
  intent: Intent
  className?: string
}) {
  const verb = verbs[intent]

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" size="xl" className="w-full">
          <GoogleIcon className="size-4.5" />
          <span className="sr-only">{verb} with </span>Google
        </Button>
        <Button type="button" variant="outline" size="xl" className="w-full">
          <GitHubIcon className="size-4.5" />
          <span className="sr-only">{verb} with </span>GitHub
        </Button>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        or {verb.toLowerCase()} with email
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}

export { SocialAuth }
