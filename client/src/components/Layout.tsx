import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Home, 
  Sprout, 
  Calendar, 
  CalendarDays, 
  Menu,
  FolderOpen,
  BarChart3,
  LogOut,
  User
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: Home },
  { name: '가치중심계획', href: '/foundation', icon: Sprout },
  { name: '일정관리', href: '/calendar', icon: CalendarDays },
  { name: '할일관리', href: '/planning', icon: FolderOpen },
  { name: '일일관리', href: '/daily', icon: Calendar },
  { name: '리뷰', href: '/review', icon: BarChart3 },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  const isActive = (href: string) => {
    if (href === '/' || href === '/dashboard') {
      return location === '/' || location === '/dashboard';
    }
    return location.startsWith(href);
  };

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col ${mobile ? 'h-full' : 'h-screen'} bg-gray-50 border-r border-gray-200`}>
      <div className="flex items-center flex-shrink-0 px-4 py-4 sm:py-5">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">개인성과 관리</h1>
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
                className={`group flex items-center px-3 py-2.5 text-sm sm:text-base font-medium rounded-md transition-colors ${
                  isActive(item.href)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`mr-3 h-5 w-5 ${
                    isActive(item.href) ? 'text-gray-500' : 'text-gray-400'
                  }`}
                />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>
      
      {/* User Profile & Logout Section */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        <div className="flex items-center">
          <Avatar className="h-8 w-8 mr-3">
            <AvatarImage src={(user as any)?.profileImageUrl} alt={(user as any)?.firstName || (user as any)?.email || '사용자'} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {(user as any)?.firstName || (user as any)?.email || '사용자'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {(user as any)?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="ml-2 p-1 text-gray-400 hover:text-gray-600"
            title="로그아웃"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <Sidebar />
      </div>

      {/* Mobile Menu - Only hamburger menu on mobile */}
      <div className="lg:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="fixed top-2 left-2 z-50 lg:hidden bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md rounded-lg p-2"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar mobile />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none pt-12 lg:pt-0 px-2 sm:px-4 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
