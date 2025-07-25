import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Home, 
  Sprout, 
  Calendar, 
  CalendarDays, 
  Repeat, 
  Target,
  Menu,
  FolderOpen,
  BarChart3,
  Focus
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: '대시보드', href: '/', icon: Home },
  { name: '가치중심계획', href: '/foundation', icon: Sprout },
  { name: '일정관리', href: '/calendar', icon: CalendarDays },
  { name: '계획관리', href: '/planning', icon: FolderOpen },
  { name: '일일관리', href: '/daily-planning', icon: Calendar },
  { name: '리뷰', href: '/review', icon: BarChart3 },
  { name: '포커스 모드', href: '/focus', icon: Focus },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/';
    }
    return location.startsWith(href);
  };

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col ${mobile ? 'h-full' : 'h-screen'} bg-gray-50 border-r border-gray-200`}>
      <div className="flex items-center flex-shrink-0 px-4 py-5">
        <h1 className="text-xl font-bold text-gray-900">개인성과 관리</h1>
      </div>
      
      <nav className="mt-5 flex-1 px-2 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => mobile && setIsMobileMenuOpen(false)}
            >
              <div
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive(item.href)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`mr-3 h-4 w-4 ${
                    isActive(item.href) ? 'text-gray-500' : 'text-gray-400'
                  }`}
                />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <Sidebar />
      </div>

      {/* Mobile Menu */}
      <div className="lg:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="fixed top-2 left-2 z-50 lg:hidden bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar mobile />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
