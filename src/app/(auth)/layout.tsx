export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-density="airy" data-portal="auth" className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">{children}</div>
    </div>
  );
}
