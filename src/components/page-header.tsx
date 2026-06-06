export function PageHeader({ title }: { title: string }) {
  return (
    <header className="mb-6 border-b border-border pb-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
    </header>
  );
}
