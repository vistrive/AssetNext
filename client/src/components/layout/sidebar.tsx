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
  Ticket
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tickets", href: "/tickets", icon: Ticket },
  { name: "Assets", href: "/assets", icon: Monitor },
  { name: "Software", href: "/software", icon: Code },
  { name: "AI Recommendations", href: "/recommendations", icon: Bot, requiredRole: "manager" },
  { name: "Team Management", href: "/users", icon: Users, requiredRole: "admin" },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, tenant, logout } = useAuth();

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

          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
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
