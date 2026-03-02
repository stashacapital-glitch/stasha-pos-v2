 import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Sidebar Component */}
      <Sidebar />
      
      {/* Main Content Area */}
      {/* lg:ml-64 adds margin for the sidebar on large screens */}
      <main className="flex-1 overflow-y-auto lg:ml-64">
        {/* pt-16 adds top padding on mobile to clear the hamburger menu */}
        <div className="pt-16 lg:pt-0 h-full">
          {children}
        </div>
      </main>
    </div>
  );
}