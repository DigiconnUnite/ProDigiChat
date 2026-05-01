import { Header } from "@/components/header"
import Link from "next/link";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb"
import { ErrorBoundary } from "@/components/error-boundary"


const currentYear = new Date().getFullYear();
  
export default function DashboardLayout({
  
  children,
}: {
  children: React.ReactNode
}) {
  return (
    
    <div className="flex bg-green-950 flex-col min-h-screen">
      <ErrorBoundary>
        <Header variant="dashboard" className="fixed top-0 left-0 right-0 z-50" />
      </ErrorBoundary>
      <main className="flex-1 z-10 pt-18 overflow-y-auto scrollbar-hide bg-background min-h-[calc(100vh-8rem)]">
        <ErrorBoundary>
          <DashboardBreadcrumb />
        </ErrorBoundary>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      <footer className="bg-green-950 h-auto  flex items-center justify-center text-white text-center text-sm  px-4" style={{backgroundColor: '#072507'}}>
        <div className="w-full bg-transparent px-2.5 lg:px-0">
          <div className="container mx-auto py-3 relative border-l border-r border-green-800 px-5">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
            <p className="text-sm text-green-200">
              © {currentYear} <span className="text-orange-400 font-bold">Prodigichat</span>. All rights reserved.
            </p>

            <p className="text-sm text-green-300">
              Developed by{" "}
              <Link
                href="https://digiconnunite.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
              >
                Digiconn Unite Pvt. Ltd.
              </Link>
            </p>

            <div className="flex items-center gap-4">
              <Link
                href="#"
                className="text-sm text-green-200 hover:text-white transition-colors"
              >
                Twitter
              </Link>
              <Link
                href="#"
                className="text-sm text-green-200 hover:text-white transition-colors"
              >
                LinkedIn
              </Link>
              <Link
                href="#"
                className="text-sm text-green-200 hover:text-white transition-colors"
              >
                GitHub
              </Link>
            </div>
          </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
