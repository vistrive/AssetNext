import { Monitor, Key, Shield, DollarSign } from "lucide-react";

interface MetricsGridProps {
  metrics: {
    totalAssets: number;
    activeLicenses: number;
    complianceScore: number;
    costSavings: number;
  };
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  const metricItems = [
    {
      title: "Total Assets",
      value: metrics.totalAssets.toLocaleString(),
      icon: Monitor,
      color: "text-primary",
      bgColor: "bg-primary/10",
      change: "+12%",
      changeColor: "text-green-600",
    },
    {
      title: "Active Licenses",
      value: metrics.activeLicenses.toLocaleString(),
      icon: Key,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      change: "-3%",
      changeColor: "text-red-600",
    },
    {
      title: "Compliance Score",
      value: `${metrics.complianceScore}%`,
      icon: Shield,
      color: "text-green-600",
      bgColor: "bg-green-100",
      change: "+2%",
      changeColor: "text-green-600",
    },
    {
      title: "Cost Savings",
      value: `$${metrics.costSavings.toLocaleString()}`,
      icon: DollarSign,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      change: "+18%",
      changeColor: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricItems.map((item) => (
        <div key={item.title} className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">{item.title}</p>
              <p 
                className="text-3xl font-bold text-foreground" 
                data-testid={`metric-${item.title.toLowerCase().replace(' ', '-')}`}
              >
                {item.value}
              </p>
            </div>
            <div className={`w-12 h-12 ${item.bgColor} rounded-lg flex items-center justify-center`}>
              <item.icon className={`${item.color} h-6 w-6`} />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className={`text-sm font-medium ${item.changeColor}`}>
              {item.change}
            </span>
            <span className="text-muted-foreground text-sm ml-2">from last month</span>
          </div>
        </div>
      ))}
    </div>
  );
}
