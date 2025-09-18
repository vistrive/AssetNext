import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Key,
  Users,
  Building,
  Save,
  AlertTriangle
} from "lucide-react";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, tenant } = useAuth();

  // User settings form state
  const [userSettings, setUserSettings] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    notifications: {
      email: true,
      push: false,
      recommendations: true,
      reports: false
    }
  });

  // Organization settings form state
  const [orgSettings, setOrgSettings] = useState({
    name: tenant?.name || "",
    timezone: "UTC",
    currency: "USD",
    autoRecommendations: true,
    dataRetention: "365"
  });

  const handleSaveUserSettings = async () => {
    setIsLoading(true);
    try {
      // This would typically make an API call to update user settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      toast({
        title: "Settings saved",
        description: "Your user settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOrgSettings = async () => {
    setIsLoading(true);
    try {
      // This would typically make an API call to update organization settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      toast({
        title: "Settings saved",
        description: "Organization settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save organization settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar 
          title="Settings" 
          description="Manage your account, organization, and application preferences"
          showAddButton={false}
        />
        
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2" data-testid="page-title">
                <Settings className="h-8 w-8" />
                Settings
              </h1>
              <p className="text-muted-foreground">
                Manage your account, organization, and application preferences
              </p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile" className="flex items-center gap-2" data-testid="tab-profile">
                  <User className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="organization" className="flex items-center gap-2" data-testid="tab-organization">
                  <Building className="h-4 w-4" />
                  Organization
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2" data-testid="tab-notifications">
                  <Bell className="h-4 w-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2" data-testid="tab-security">
                  <Shield className="h-4 w-4" />
                  Security
                </TabsTrigger>
              </TabsList>

              {/* Profile Settings */}
              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Profile Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={userSettings.firstName}
                          onChange={(e) => setUserSettings(prev => ({ ...prev, firstName: e.target.value }))}
                          data-testid="input-first-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={userSettings.lastName}
                          onChange={(e) => setUserSettings(prev => ({ ...prev, lastName: e.target.value }))}
                          data-testid="input-last-name"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userSettings.email}
                        onChange={(e) => setUserSettings(prev => ({ ...prev, email: e.target.value }))}
                        data-testid="input-email"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <div>
                        <p className="font-medium">Current Role</p>
                        <Badge variant="secondary" data-testid="badge-user-role">
                          {user?.role}
                        </Badge>
                      </div>
                      <Button onClick={handleSaveUserSettings} disabled={isLoading} data-testid="button-save-profile">
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Organization Settings */}
              <TabsContent value="organization" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Organization Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="orgName">Organization Name</Label>
                      <Input
                        id="orgName"
                        value={orgSettings.name}
                        onChange={(e) => setOrgSettings(prev => ({ ...prev, name: e.target.value }))}
                        data-testid="input-org-name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={orgSettings.timezone} onValueChange={(value) => setOrgSettings(prev => ({ ...prev, timezone: value }))}>
                          <SelectTrigger data-testid="select-timezone">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="EST">EST</SelectItem>
                            <SelectItem value="PST">PST</SelectItem>
                            <SelectItem value="GMT">GMT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={orgSettings.currency} onValueChange={(value) => setOrgSettings(prev => ({ ...prev, currency: value }))}>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="INR">INR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-4">
                      <div className="space-y-1">
                        <Label htmlFor="autoRecommendations">Auto-generate AI Recommendations</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically generate optimization recommendations weekly
                        </p>
                      </div>
                      <Switch
                        id="autoRecommendations"
                        checked={orgSettings.autoRecommendations}
                        onCheckedChange={(checked) => setOrgSettings(prev => ({ ...prev, autoRecommendations: checked }))}
                        data-testid="switch-auto-recommendations"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSaveOrgSettings} disabled={isLoading} data-testid="button-save-org">
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Settings */}
              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {Object.entries({
                      email: "Email Notifications",
                      push: "Push Notifications",
                      recommendations: "AI Recommendation Alerts",
                      reports: "Weekly Reports"
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor={key}>{label}</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive {label.toLowerCase()} about important updates
                          </p>
                        </div>
                        <Switch
                          id={key}
                          checked={userSettings.notifications[key as keyof typeof userSettings.notifications]}
                          onCheckedChange={(checked) => setUserSettings(prev => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              [key]: checked
                            }
                          }))}
                          data-testid={`switch-${key}-notifications`}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Settings */}
              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">Change Password</p>
                          <p className="text-sm text-muted-foreground">
                            Update your account password
                          </p>
                        </div>
                        <Button variant="outline" data-testid="button-change-password">
                          <Key className="h-4 w-4 mr-2" />
                          Change Password
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-muted-foreground">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Button variant="outline" data-testid="button-setup-2fa">
                          <Shield className="h-4 w-4 mr-2" />
                          Setup 2FA
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">API Keys</p>
                          <p className="text-sm text-muted-foreground">
                            Manage your API keys for integrations
                          </p>
                        </div>
                        <Button variant="outline" data-testid="button-manage-api-keys">
                          <Key className="h-4 w-4 mr-2" />
                          Manage Keys
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Danger Zone
                      </h3>
                      
                      <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">Delete Account</p>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete your account and all associated data
                          </p>
                        </div>
                        <Button variant="destructive" data-testid="button-delete-account">
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}