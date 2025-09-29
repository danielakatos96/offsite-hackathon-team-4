export const metadata = {
  title: "Admin",
  description: "Admin page",
};

export default function AdminPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-semibold mb-4">Admin</h1>
        <p className="text-base opacity-80">This is the admin page. Add your admin tools and controls here.</p>
      </div>
    </div>
  );
}
