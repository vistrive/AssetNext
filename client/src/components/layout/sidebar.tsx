import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Monitor, 
  Code, 
  Bot, 
  BarChart3, 
  Settings, 
  LogOut,
  User,
  Server,
  Users,
  Ticket,
  ChevronDown,
  ChevronRight,
  Laptop,
  Printer,
  Package
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tickets", href: "/tickets", icon: Ticket },
  { 
    name: "Assets", 
    href: "/assets", 
    icon: Monitor,
    subItems: [
      { name: "Hardware", href: "/assets?type=hardware", icon: Laptop },
      { name: "Software", href: "/assets?type=software", icon: Code },
      { name: "Peripherals", href: "/assets?type=peripheral", icon: Printer },
      { name: "Others", href: "/assets?type=others", icon: Package },
    ]
  },
  { name: "AI Recommendations", href: "/recommendations", icon: Bot, requiredRole: "manager" },
  { name: "Team Management", href: "/users", icon: Users, requiredRole: "admin" },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, tenant, logout } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Assets"]); // Assets expanded by default
  
  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    );
  };
  
  const isMenuExpanded = (menuName: string) => expandedMenus.includes(menuName);
  
  const isSubItemActive = (item: any) => {
    if (!item.subItems) return location === item.href;
    
    // Check if current location matches any subitem
    return item.subItems.some((subItem: any) => {
      const subItemPath = subItem.href.split('?')[0];
      const currentPath = location.split('?')[0];
      return currentPath === subItemPath;
    });
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Server className="text-primary-foreground h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">AssetVault</h1>
            <p className="text-xs text-muted-foreground">{tenant?.name}</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          // Hide links based on role hierarchy
          if (item.requiredRole && user) {
            const roleHierarchy = ["employee", "technician", "manager", "admin"];
            const userRoleIndex = roleHierarchy.indexOf(user.role);
            const requiredRoleIndex = roleHierarchy.indexOf(item.requiredRole);
            
            if (userRoleIndex < requiredRoleIndex) {
              return null;
            }
          }

          const isActive = isSubItemActive(item);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = isMenuExpanded(item.name);

          return (
            <div key={item.name}>
              {hasSubItems ? (
                // Parent menu with submenu
                <div>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`sidebar-link w-full text-left ${isActive ? 'active' : ''}`}
                    data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    ) : (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                    {item.name === "AI Recommendations" && (
                      <span className="ml-2 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">
                        3
                      </span>
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="ml-8 mt-2 space-y-1">
                      {item.subItems.map((subItem: any) => {
                        const isSubActive = location === subItem.href || 
                          (location.includes('?') && location.startsWith(subItem.href));
                        
                        return (
                          <Link key={subItem.name} href={subItem.href}>
                            <a 
                              className={`sidebar-link text-sm ${isSubActive ? 'active' : ''}`}
                              data-testid={`nav-${subItem.name.toLowerCase().replace(' ', '-')}`}
                            >
                              <subItem.icon className="w-4 h-4 mr-3" />
                              {subItem.name}
                            </a>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // Regular menu item
                <Link href={item.href}>
                  <a 
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                    {item.name === "AI Recommendations" && (
                      <span className="ml-auto bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">
                        3
                      </span>
                    )}
                  </a>
                </Link>
              )}
            </div>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="text-muted-foreground h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role?.replace('-', ' ')}
            </p>
          </div>
          <button 
            onClick={logout}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
