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
  ChevronDown,
  ChevronRight,
  Focus,
  BookOpen,
  ListTodo,
  FolderPlus
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  subItems?: NavItem[];
}

const navigation: NavItem[] = [
  { name: '대시보드', href: '/', icon: Home },
  { name: '가치 중심계획', href: '/foundation', icon: Sprout },
  { name: '일정관리', href: '/calendar', icon: CalendarDays },
  { 
    name: '계획수립', 
    icon: FolderOpen,
    subItems: [
      { name: '프로젝트관리', href: '/project-management', icon: FolderPlus },
      { name: '할일관리', href: '/task-management', icon: ListTodo },
      { name: '습관관리', href: '/habit-management', icon: Target },
    ]
  },
  { name: '일일관리', href: '/daily-planning', icon: Calendar },
  { name: '포커스 모드', href: '/focus', icon: Focus },
  { name: '주간리뷰', href: '/weekly', icon: Repeat },
  { name: '월간리뷰', href: '/monthly', icon: BookOpen },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['계획수립']);

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/') {
      return location === '/';
    }
    return location.startsWith(href);
  };

  const isItemActive = (item: NavItem): boolean => {
    if (item.href && isActive(item.href)) return true;
    if (item.subItems) {
      return item.subItems.some(subItem => isActive(subItem.href));
    }
    return false;
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col ${mobile ? 'h-full' : 'h-screen'} bg-gray-50 border-r border-gray-200`}>
      <div className="flex items-center flex-shrink-0 px-4 py-5">
        <h1 className="text-xl font-bold text-gray-900">개인성과 관리</h1>
      </div>
      
      <nav className="mt-5 flex-1 px-2 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedItems.includes(item.name);
          const active = isItemActive(item);
          
          return (
            <div key={item.name}>
              {hasSubItems ? (
                <div>
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className={`w-full group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      active
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon
                        className={`mr-3 h-4 w-4 ${
                          active ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      />
                      {item.name}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="mt-1 ml-6 space-y-1">
                      {item.subItems?.map((subItem) => {
                        const SubIcon = subItem.icon;
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href!}
                            onClick={() => mobile && setIsMobileMenuOpen(false)}
                          >
                            <div
                              className={`group flex items-center px-2 py-2 text-sm rounded-md transition-colors ${
                                isActive(subItem.href)
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              <SubIcon
                                className={`mr-3 h-4 w-4 ${
                                  isActive(subItem.href) ? 'text-blue-500' : 'text-gray-400'
                                }`}
                              />
                              {subItem.name}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href!}
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
              )}
            </div>
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
              className="fixed top-4 left-4 z-40 lg:hidden"
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
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
