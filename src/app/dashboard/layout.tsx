import { Header } from "@/components/header"
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header variant="dashboard" className="fixed top-0 left-0 right-0 z-50" />
      <main className="flex-1 z-10 md:px-8 px-3 py-5 md:pt-24 pt-24 overflow-y-auto scrollbar-hide bg-background rounded-b-4xl mb-16 ">
        <DashboardBreadcrumb />
        {children}
      </main>
      <footer className="bg-green-950 h-auto min-h-[60px] flex items-center justify-center text-white text-center text-sm py-3 px-4">
        <p>© 2025 WhatsApp Marketing Tool. Developed by Digiconn Unite Pvt. Ltd.</p>
      </footer>
    </div>
  );
}
