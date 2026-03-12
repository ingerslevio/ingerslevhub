import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2 pb-2">
          <h1 className="text-3xl font-bold tracking-tight">Family Hub</h1>
          <p className="text-sm text-muted-foreground">
            Manage meals, homework, and family schedule in one place
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <Button asChild className="w-full" size="lg">
            <a href="/api/auth/google">Sign in with Google</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
