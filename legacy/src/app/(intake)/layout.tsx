/**
 * Intake Layout — Public diagnostic flow.
 * data-density="airy" pour conversion / score reveal.
 */

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-density="airy" data-portal="intake" className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
