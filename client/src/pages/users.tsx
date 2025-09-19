import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Users as UsersIcon, 
  UserPlus, 
  Search, 
  Mail, 
  Shield, 
  UserCheck, 
  UserX, 
  Crown,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Edit,
  Trash2
} from "lucide-react";
import { inviteUserSchema, updateUserRoleSchema, type InviteUser, type UpdateUserRole } from "@shared/schema";

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  jobTitle?: string;
  isActive: boolean;
  lastLoginAt?: string;
  invitedBy?: string;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  inviterName?: string;
}

export default function Users() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Fetch team members
  const { data: teamMembers = [], isLoading: teamLoading, error: teamError } = useQuery<TeamMember[]>({
    queryKey: ["/api/users"],
  });

  // Fetch invitations
  const { data: allInvitations = [], isLoading: invitationsLoading, error: invitationsError } = useQuery<Invitation[]>({
    queryKey: ["/api/users/invitations"],
  });

  // Invite user form
  const inviteForm = useForm<InviteUser>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: "read-only",
    },
  });

  // Role update form
  const roleForm = useForm<UpdateUserRole>({
    resolver: zodResolver(updateUserRoleSchema),
    defaultValues: {
      role: "read-only",
    },
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (inviteData: InviteUser) => {
      const response = await apiRequest("POST", "/api/users/invite", inviteData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/invitations"] });
      setIsInviteDialogOpen(false);
      inviteForm.reset();
      toast({
        title: "Invitation sent",
        description: "Team member invitation has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, roleData }: { userId: string; roleData: UpdateUserRole }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/role`, roleData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsRoleDialogOpen(false);
      setEditingUser(null);
      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update role",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/deactivate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User deactivated",
        description: "User account has been deactivated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to deactivate user",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Activate user mutation
  const activateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/activate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User activated",
        description: "User account has been activated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to activate user",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInviteSubmit = (data: InviteUser) => {
    inviteUserMutation.mutate(data);
  };

  const handleRoleUpdate = (data: UpdateUserRole) => {
    if (editingUser) {
      updateRoleMutation.mutate({ userId: editingUser.id, roleData: data });
    }
  };

  const handleEditRole = (user: TeamMember) => {
    setEditingUser(user);
    roleForm.setValue("role", user.role as any);
    setIsRoleDialogOpen(true);
  };

  const handleToggleStatus = (user: TeamMember) => {
    if (user.isActive) {
      deactivateUserMutation.mutate(user.id);
    } else {
      activateUserMutation.mutate(user.id);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "it-manager": return "default";
      case "read-only": return "secondary";
      default: return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending": return "secondary";
      case "accepted": return "default";
      case "expired": return "destructive";
      default: return "outline";
    }
  };

  // Filter team members
  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = `${member.firstName} ${member.lastName} ${member.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && member.isActive) ||
      (statusFilter === "inactive" && !member.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filter invitations to only show pending ones
  const pendingInvitations = allInvitations.filter(invitation => invitation.status === 'pending');
  const filteredInvitations = pendingInvitations.filter(invitation => {
    const matchesSearch = `${invitation.firstName} ${invitation.lastName} ${invitation.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <TopBar title="Team Management" description="Manage your organization's team members and invitations" />
        <main className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
                  Team Management
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your organization's team members and invitations
                </p>
              </div>
              
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-invite-user">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Team Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          data-testid="input-first-name"
                          {...inviteForm.register("firstName")}
                          placeholder="Enter first name"
                        />
                        {inviteForm.formState.errors.firstName && (
                          <p className="text-sm text-destructive mt-1">
                            {inviteForm.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          data-testid="input-last-name"
                          {...inviteForm.register("lastName")}
                          placeholder="Enter last name"
                        />
                        {inviteForm.formState.errors.lastName && (
                          <p className="text-sm text-destructive mt-1">
                            {inviteForm.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        data-testid="input-email"
                        {...inviteForm.register("email")}
                        placeholder="Enter email address"
                      />
                      {inviteForm.formState.errors.email && (
                        <p className="text-sm text-destructive mt-1">
                          {inviteForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={inviteForm.watch("role")}
                        onValueChange={(value) => inviteForm.setValue("role", value as any)}
                      >
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read-only">Read Only</SelectItem>
                          <SelectItem value="it-manager">IT Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {inviteForm.formState.errors.role && (
                        <p className="text-sm text-destructive mt-1">
                          {inviteForm.formState.errors.role.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsInviteDialogOpen(false)}
                        data-testid="button-cancel-invite"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={inviteUserMutation.isPending}
                        data-testid="button-send-invite"
                      >
                        {inviteUserMutation.isPending ? "Sending..." : "Send Invitation"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search team members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-users"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-32" data-testid="select-role-filter">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="it-manager">IT Manager</SelectItem>
                      <SelectItem value="read-only">Read Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-32" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Error Handling */}
            {teamError && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Failed to load team members</h3>
                    <p className="text-muted-foreground">
                      {teamError instanceof Error ? teamError.message : "Unable to load team data. Please try again."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {invitationsError && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Failed to load invitations</h3>
                    <p className="text-muted-foreground">
                      {invitationsError instanceof Error ? invitationsError.message : "Unable to load invitation data. Please try again."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs for Team Members and Invitations */}
            {!teamError && !invitationsError && (
              <Tabs defaultValue="team" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="team" data-testid="tab-team-members">
                    <UsersIcon className="h-4 w-4 mr-2" />
                    Team Members ({filteredTeamMembers.length})
                  </TabsTrigger>
                  <TabsTrigger value="invitations" data-testid="tab-invitations">
                    <Mail className="h-4 w-4 mr-2" />
                    Pending Invitations ({filteredInvitations.length})
                  </TabsTrigger>
                </TabsList>

              {/* Team Members Tab */}
              <TabsContent value="team" className="space-y-4">
                {teamLoading ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-muted-foreground mt-2">Loading team members...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : filteredTeamMembers.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No team members found</h3>
                        <p className="text-muted-foreground mb-4">
                          {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                            ? "Try adjusting your filters to see more results."
                            : "Start by inviting your first team member."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {filteredTeamMembers.map((member) => (
                      <Card key={member.id} data-testid={`card-user-${member.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                  {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium text-foreground" data-testid={`text-user-name-${member.id}`}>
                                  {member.firstName} {member.lastName}
                                  {member.id === currentUser?.id && (
                                    <span className="text-muted-foreground text-sm ml-2">(You)</span>
                                  )}
                                </h3>
                                <p className="text-sm text-muted-foreground" data-testid={`text-user-email-${member.id}`}>
                                  {member.email}
                                </p>
                                {member.jobTitle && (
                                  <p className="text-xs text-muted-foreground">
                                    {member.jobTitle}
                                    {member.department && ` • ${member.department}`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={getRoleBadgeVariant(member.role)} data-testid={`badge-role-${member.id}`}>
                                {member.role === "admin" && <Crown className="h-3 w-3 mr-1" />}
                                {member.role === "it-manager" && <Shield className="h-3 w-3 mr-1" />}
                                {member.role === "read-only" && <UserCheck className="h-3 w-3 mr-1" />}
                                {member.role.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                              <Badge 
                                variant={member.isActive ? "default" : "secondary"}
                                data-testid={`badge-status-${member.id}`}
                              >
                                {member.isActive ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inactive
                                  </>
                                )}
                              </Badge>
                              {member.id !== currentUser?.id && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditRole(member)}
                                    data-testid={`button-edit-role-${member.id}`}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleStatus(member)}
                                    disabled={deactivateUserMutation.isPending || activateUserMutation.isPending}
                                    data-testid={`button-toggle-status-${member.id}`}
                                  >
                                    {member.isActive ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Invitations Tab */}
              <TabsContent value="invitations" className="space-y-4">
                {invitationsLoading ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-muted-foreground mt-2">Loading invitations...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : filteredInvitations.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No pending invitations</h3>
                        <p className="text-muted-foreground mb-4">
                          All invitations have been accepted or there are no pending invitations.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {filteredInvitations.map((invitation) => (
                      <Card key={invitation.id} data-testid={`card-invitation-${invitation.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-muted">
                                  {invitation.firstName.charAt(0)}{invitation.lastName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium text-foreground" data-testid={`text-invitation-name-${invitation.id}`}>
                                  {invitation.firstName} {invitation.lastName}
                                </h3>
                                <p className="text-sm text-muted-foreground" data-testid={`text-invitation-email-${invitation.id}`}>
                                  {invitation.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Invited by {invitation.inviterName} • Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={getRoleBadgeVariant(invitation.role)} data-testid={`badge-invitation-role-${invitation.id}`}>
                                {invitation.role === "admin" && <Crown className="h-3 w-3 mr-1" />}
                                {invitation.role === "it-manager" && <Shield className="h-3 w-3 mr-1" />}
                                {invitation.role === "read-only" && <UserCheck className="h-3 w-3 mr-1" />}
                                {invitation.role.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                              <Badge variant={getStatusBadgeVariant(invitation.status)} data-testid={`badge-invitation-status-${invitation.id}`}>
                                <Clock className="h-3 w-3 mr-1" />
                                {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>

      {/* Role Update Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update User Role</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={roleForm.handleSubmit(handleRoleUpdate)} className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {editingUser.firstName.charAt(0)}{editingUser.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{editingUser.firstName} {editingUser.lastName}</p>
                  <p className="text-sm text-muted-foreground">{editingUser.email}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="newRole">New Role</Label>
                <Select
                  value={roleForm.watch("role")}
                  onValueChange={(value) => roleForm.setValue("role", value as any)}
                >
                  <SelectTrigger data-testid="select-new-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read-only">Read Only</SelectItem>
                    <SelectItem value="it-manager">IT Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {roleForm.formState.errors.role && (
                  <p className="text-sm text-destructive mt-1">
                    {roleForm.formState.errors.role.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRoleDialogOpen(false)}
                  data-testid="button-cancel-role-update"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateRoleMutation.isPending}
                  data-testid="button-update-role"
                >
                  {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}