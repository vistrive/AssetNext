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
  Package,
  Smartphone,
  Tablet,
  HardDrive,
  Mouse,
  Router,
  Wifi,
  Camera,
  Shield,
  Scan
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tickets", href: "/tickets", icon: Ticket },
  { 
    name: "Assets", 
    href: "/assets", 
    icon: Monitor,
    subItems: [
      { 
        name: "Hardware", 
        href: "/assets?type=hardware", 
        icon: Laptop,
        subItems: [
          { name: "PC", href: "/assets?type=hardware&category=pc", icon: Monitor },
          { name: "Laptop", href: "/assets?type=hardware&category=laptop", icon: Laptop },
          { name: "Server", href: "/assets?type=hardware&category=server", icon: Server },
          { name: "Racks", href: "/assets?type=hardware&category=rack", icon: HardDrive },
          { name: "Mobile Phone", href: "/assets?type=hardware&category=mobile", icon: Smartphone },
          { name: "Tablets", href: "/assets?type=hardware&category=tablet", icon: Tablet },
        ]
      },
      { name: "Software", href: "/assets?type=software", icon: Code },
      { 
        name: "Peripherals", 
        href: "/assets?type=peripheral", 
        icon: Printer,
        subItems: [
          { name: "Printers", href: "/assets?type=peripheral&category=printer", icon: Printer },
          { name: "3D Printers", href: "/assets?type=peripheral&category=3d-printer", icon: Package },
          { name: "Scanners", href: "/assets?type=peripheral&category=scanner", icon: Scan },
          { name: "Mouse", href: "/assets?type=peripheral&category=mouse", icon: Mouse },
          { name: "Routers", href: "/assets?type=peripheral&category=router", icon: Router },
          { name: "Switches", href: "/assets?type=peripheral&category=switch", icon: Wifi },
          { name: "Hubs", href: "/assets?type=peripheral&category=hub", icon: Wifi },
        ]
      },
      { 
        name: "Others", 
        href: "/assets?type=others", 
        icon: Package,
        subItems: [
          { name: "CCTV Cameras", href: "/assets?type=others&category=cctv", icon: Camera },
          { name: "Access Control", href: "/assets?type=others&category=access-control", icon: Shield },
        ]
      },
    ]
  },
  { name: "Team Management", href: "/users", icon: Users, requiredRole: "admin" },
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
    
    // Check if current location matches any subitem or sub-subitem
    return item.subItems.some((subItem: any) => {
      if (location === subItem.href || location.includes(subItem.href)) return true;
      
      // Check nested subItems (third level)
      if (subItem.subItems) {
        return subItem.subItems.some((nestedItem: any) => 
          location === nestedItem.href || location.includes(nestedItem.href)
        );
      }
      return false;
    });
  };

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-card border-r border-border flex flex-col z-10">
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
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
                // Parent menu with submenu - separate text link and dropdown button
                <div>
                  <div className="flex items-center">
                    {/* Main text/icon - clicks to navigate */}
                    <Link href={item.href} className="flex-1">
                      <div 
                        className={`sidebar-link ${isActive ? 'active' : ''}`}
                        data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                      >
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.name}
                        {item.name === "AI Recommendations" && (
                          <span className="ml-2 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">
                            3
                          </span>
                        )}
                      </div>
                    </Link>
                    
                    {/* Separate dropdown button - only toggles expansion */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleMenu(item.name);
                      }}
                      className="p-2 hover:bg-muted rounded-md transition-colors"
                      data-testid={`dropdown-${item.name.toLowerCase().replace(' ', '-')}`}
                      title={`${isExpanded ? 'Collapse' : 'Expand'} ${item.name} menu`}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <div className="ml-8 mt-2 space-y-1">
                      {item.subItems.map((subItem: any) => {
                        const isSubActive = location === subItem.href || 
                          (location.includes('?') && location.includes(subItem.href.split('?')[1]));
                        const hasNestedSubItems = subItem.subItems && subItem.subItems.length > 0;
                        const isSubExpanded = isMenuExpanded(subItem.name);
                        
                        return (
                          <div key={subItem.name}>
                            {hasNestedSubItems ? (
                              // Sub-item with nested items
                              <div>
                                <button
                                  onClick={() => toggleMenu(subItem.name)}
                                  className={`sidebar-link text-sm w-full text-left ${isSubActive ? 'active' : ''}`}
                                  data-testid={`nav-${subItem.name.toLowerCase().replace(' ', '-')}`}
                                >
                                  <subItem.icon className="w-4 h-4 mr-3" />
                                  {subItem.name}
                                  {isSubExpanded ? (
                                    <ChevronDown className="w-3 h-3 ml-auto" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 ml-auto" />
                                  )}
                                </button>
                                
                                {isSubExpanded && (
                                  <div className="ml-6 mt-1 space-y-1">
                                    {subItem.subItems.map((nestedItem: any) => {
                                      const isNestedActive = location === nestedItem.href || 
                                        location.includes(nestedItem.href);
                                      
                                      return (
                                        <Link key={nestedItem.name} href={nestedItem.href}>
                                          <div 
                                            className={`sidebar-link text-xs ${isNestedActive ? 'active' : ''}`}
                                            data-testid={`nav-${nestedItem.name.toLowerCase().replace(/\s+/g, '-')}`}
                                          >
                                            <nestedItem.icon className="w-3 h-3 mr-2" />
                                            {nestedItem.name}
                                          </div>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Regular sub-item
                              <Link href={subItem.href}>
                                <div 
                                  className={`sidebar-link text-sm ${isSubActive ? 'active' : ''}`}
                                  data-testid={`nav-${subItem.name.toLowerCase().replace(' ', '-')}`}
                                >
                                  <subItem.icon className="w-4 h-4 mr-3" />
                                  {subItem.name}
                                </div>
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // Regular menu item
                <Link href={item.href}>
                  <div 
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
                  </div>
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
