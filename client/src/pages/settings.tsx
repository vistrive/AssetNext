import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  updateUserProfileSchema,
  updateUserPreferencesSchema, 
  updateOrgSettingsSchema,
  type UpdateUserProfile, 
  type UpdateUserPreferences, 
  type UpdateOrgSettings,
  type User as UserType,
  type UserPreferences
} from "@shared/schema";
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, tenant } = useAuth();

  // Fetch user profile data
  const { data: userProfile, isLoading: userProfileLoading, error: userProfileError } = useQuery<UserType>({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/users/me");
      return response.json();
    },
  });

  // Fetch user preferences data
  const { data: userPreferences, isLoading: userPreferencesLoading, error: userPreferencesError } = useQuery<UserPreferences>({
    queryKey: ["/api/users/me/preferences"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/users/me/preferences");
      return response.json();
    },
  });

  // Fetch organization settings data  
  const { data: orgSettings, isLoading: orgSettingsLoading, error: orgSettingsError } = useQuery({
    queryKey: ["/api/org/settings"],
    queryFn: async () => {
      const response = await authenticatedRequest("GET", "/api/org/settings");
      return response.json();
    },
    enabled: user?.role === "admin", // Only admin can view org settings
  });

  // React Hook Form setup
  const profileForm = useForm<UpdateUserProfile>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      department: "",
      jobTitle: "",
      manager: "",
    },
  });

  const preferencesForm = useForm<UpdateUserPreferences>({
    resolver: zodResolver(updateUserPreferencesSchema),
    defaultValues: {
      emailNotifications: false,
      pushNotifications: false,
      aiRecommendationAlerts: false,
      weeklyReports: false,
      assetExpiryAlerts: false,
      theme: "light",
      language: "en",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      itemsPerPage: 25,
    },
  });

  const orgForm = useForm<UpdateOrgSettings>({
    resolver: zodResolver(updateOrgSettingsSchema),
    defaultValues: {
      name: "",
      timezone: "UTC",
      currency: "USD",
      dateFormat: "MM/DD/YYYY",
      autoRecommendations: false,
      dataRetentionDays: 365,
    },
  });

  // Update forms when data loads
  React.useEffect(() => {
    if (userProfile) {
      profileForm.reset({
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        phone: userProfile.phone || "",
        department: userProfile.department || "",
        jobTitle: userProfile.jobTitle || "",
        manager: userProfile.manager || "",
      });
    }
  }, [userProfile, profileForm]);

  React.useEffect(() => {
    if (userPreferences) {
      preferencesForm.reset({
        emailNotifications: userPreferences.emailNotifications || false,
        pushNotifications: userPreferences.pushNotifications || false,
        aiRecommendationAlerts: userPreferences.aiRecommendationAlerts || false,
        weeklyReports: userPreferences.weeklyReports || false,
        assetExpiryAlerts: userPreferences.assetExpiryAlerts || false,
        theme: userPreferences.theme || "light",
        language: userPreferences.language || "en",
        timezone: userPreferences.timezone || "UTC",
        dateFormat: userPreferences.dateFormat || "MM/DD/YYYY",
        itemsPerPage: userPreferences.itemsPerPage || 25,
      });
    }
  }, [userPreferences, preferencesForm]);

  React.useEffect(() => {
    if (orgSettings) {
      orgForm.reset({
        name: orgSettings.name || "",
        timezone: orgSettings.timezone || "UTC",
        currency: orgSettings.currency || "USD",
        dateFormat: orgSettings.dateFormat || "MM/DD/YYYY",
        autoRecommendations: orgSettings.autoRecommendations || false,
        dataRetentionDays: orgSettings.dataRetentionDays || 365,
      });
    }
  }, [orgSettings, orgForm]);

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateUserProfile) => {
      const response = await authenticatedRequest("PATCH", "/api/users/me", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update user preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: UpdateUserPreferences) => {
      const response = await authenticatedRequest("PATCH", "/api/users/me/preferences", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/preferences"] });
      toast({
        title: "Preferences updated",
        description: "Your preferences have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update organization settings mutation
  const updateOrgSettingsMutation = useMutation({
    mutationFn: async (data: UpdateOrgSettings) => {
      const response = await authenticatedRequest("PATCH", "/api/org/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/settings"] });
      toast({
        title: "Organization settings updated",
        description: "Organization settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update organization settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: UpdateUserProfile) => {
    updateProfileMutation.mutate(data);
  };

  const onPreferencesSubmit = (data: UpdateUserPreferences) => {
    updatePreferencesMutation.mutate(data);
  };

  const onOrgSubmit = (data: UpdateOrgSettings) => {
    updateOrgSettingsMutation.mutate(data);
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
                    {userProfileLoading ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Skeleton className="h-4 w-20 mb-2" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                          <div>
                            <Skeleton className="h-4 w-20 mb-2" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                        </div>
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              value={profileForm.firstName}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                              data-testid="input-first-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              value={profileForm.lastName}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                              data-testid="input-last-name"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                              id="phone"
                              value={profileForm.phone}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                              data-testid="input-phone"
                            />
                          </div>
                          <div>
                            <Label htmlFor="department">Department</Label>
                            <Input
                              id="department"
                              value={profileForm.department}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, department: e.target.value }))}
                              data-testid="input-department"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="jobTitle">Job Title</Label>
                            <Input
                              id="jobTitle"
                              value={profileForm.jobTitle}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                              data-testid="input-job-title"
                            />
                          </div>
                          <div>
                            <Label htmlFor="manager">Manager</Label>
                            <Input
                              id="manager"
                              value={profileForm.manager}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, manager: e.target.value }))}
                              data-testid="input-manager"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                          <div>
                            <p className="font-medium">Current Role</p>
                            <Badge variant="secondary" data-testid="badge-user-role">
                              {user?.role}
                            </Badge>
                          </div>
                          <Button 
                            onClick={handleSaveProfile} 
                            disabled={updateProfileMutation.isPending} 
                            data-testid="button-save-profile"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Organization Settings */}
              <TabsContent value="organization" className="space-y-6">
                {user?.role !== "admin" ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-muted-foreground">
                        You need admin privileges to access organization settings.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Organization Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {orgSettingsLoading ? (
                        <div className="space-y-4">
                          <Skeleton className="h-10 w-full" />
                          <div className="grid grid-cols-2 gap-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                          <Skeleton className="h-6 w-full" />
                        </div>
                      ) : (
                        <>
                          <div>
                            <Label htmlFor="orgName">Organization Name</Label>
                            <Input
                              id="orgName"
                              value={orgForm.name}
                              onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                              data-testid="input-org-name"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="timezone">Timezone</Label>
                              <Select value={orgForm.timezone} onValueChange={(value) => setOrgForm(prev => ({ ...prev, timezone: value }))}>
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
                              <Select value={orgForm.currency} onValueChange={(value) => setOrgForm(prev => ({ ...prev, currency: value }))}>
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
                              checked={orgForm.autoAIRecommendations}
                              onCheckedChange={(checked) => setOrgForm(prev => ({ ...prev, autoAIRecommendations: checked }))}
                              data-testid="switch-auto-recommendations"
                            />
                          </div>

                          <div className="flex justify-end">
                            <Button 
                              onClick={handleSaveOrgSettings} 
                              disabled={updateOrgSettingsMutation.isPending} 
                              data-testid="button-save-org"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {updateOrgSettingsMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
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
                    {userPreferencesLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-6 w-12" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {Object.entries({
                          emailNotifications: "Email Notifications",
                          pushNotifications: "Push Notifications", 
                          aiRecommendations: "AI Recommendation Alerts",
                          weeklyReports: "Weekly Reports"
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
                              checked={preferencesForm[key as keyof typeof preferencesForm] as boolean}
                              onCheckedChange={(checked) => setPreferencesForm(prev => ({
                                ...prev,
                                [key]: checked
                              }))}
                              data-testid={`switch-${key}-notifications`}
                            />
                          </div>
                        ))}
                        
                        <div className="flex justify-end pt-4">
                          <Button 
                            onClick={handleSavePreferences} 
                            disabled={updatePreferencesMutation.isPending} 
                            data-testid="button-save-preferences"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {updatePreferencesMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </>
                    )}
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