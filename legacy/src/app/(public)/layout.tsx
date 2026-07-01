/**
 * Public Layout — Static pages (changelog, status).
 */

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-density="airy" data-portal="public" className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
