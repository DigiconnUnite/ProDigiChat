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
      <main className="flex-1 min-h-screen z-10 md:px-8 px-3 py-5 md:pt-24 pt-24 overflow-y-auto scrollbar-hide bg-background rounded-b-4xl">
        <ErrorBoundary>
          <DashboardBreadcrumb />
        </ErrorBoundary>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
      <footer className="bg-green-950 h-auto min-h-15 flex items-center justify-center text-white text-center text-sm py-3 px-4">
        <div className="w-full container mx-auto">
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
      </footer>
    </div>
  );
}
