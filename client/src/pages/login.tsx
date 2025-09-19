import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Server } from "lucide-react";
import { loginSchema, registerSchema } from "@shared/schema";
import type { LoginRequest, RegisterRequest } from "@shared/schema";

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const { login, register: registerUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const loginForm = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterRequest>({
    resolver: zodResolver(registerSchema),
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  const handleLogin = async (data: LoginRequest) => {
    try {
      await login(data);
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (data: RegisterRequest) => {
    try {
      await registerUser(data);
      toast({
        title: "Account created!",
        description: "Your account has been created successfully.",
      });
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "Unable to create account. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Server className="text-primary-foreground h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {isRegistering ? "Create Your Organization" : "Sign In to AssetVault"}
          </CardTitle>
          {isRegistering && (
            <p className="text-sm text-muted-foreground mt-2">
              Create a new organization account. You will be the administrator.
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          {isRegistering ? (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...registerForm.register("firstName")}
                    placeholder="John"
                    data-testid="input-first-name"
                  />
                  {registerForm.formState.errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">
                      {registerForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...registerForm.register("lastName")}
                    placeholder="Smith"
                    data-testid="input-last-name"
                  />
                  {registerForm.formState.errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">
                      {registerForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...registerForm.register("email")}
                  placeholder="john@company.com"
                  data-testid="input-email"
                />
                {registerForm.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...registerForm.register("password")}
                  placeholder="••••••••"
                  data-testid="input-password"
                />
                {registerForm.formState.errors.password && (
                  <p className="text-red-500 text-sm mt-1">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="tenantName">Company Name</Label>
                <Input
                  id="tenantName"
                  {...registerForm.register("tenantName")}
                  placeholder="Your Company Inc."
                  data-testid="input-tenant-name"
                />
                {registerForm.formState.errors.tenantName && (
                  <p className="text-red-500 text-sm mt-1">
                    {registerForm.formState.errors.tenantName.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  {...registerForm.register("role")}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="select-role"
                >
                  <option value="">Select your role</option>
                  <option value="employee">Employee</option>
                  <option value="technician">Technician</option>
                </select>
                {registerForm.formState.errors.role && (
                  <p className="text-red-500 text-sm mt-1">
                    {registerForm.formState.errors.role.message}
                  </p>
                )}
              </div>
              
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={registerForm.formState.isSubmitting}
                data-testid="button-register"
              >
                {registerForm.formState.isSubmitting ? "Creating Account..." : "Create Account"}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-primary hover:underline text-sm"
                  data-testid="link-to-login"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...loginForm.register("email")}
                  placeholder="admin@company.com"
                  data-testid="input-email"
                />
                {loginForm.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...loginForm.register("password")}
                  placeholder="••••••••"
                  data-testid="input-password"
                />
                {loginForm.formState.errors.password && (
                  <p className="text-red-500 text-sm mt-1">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <Label htmlFor="remember" className="text-sm">Remember me</Label>
                </div>
                <button
                  type="button"
                  className="text-primary hover:underline text-sm"
                  data-testid="link-forgot-password"
                >
                  Forgot password?
                </button>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={loginForm.formState.isSubmitting}
                data-testid="button-login"
              >
                {loginForm.formState.isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-primary hover:underline text-sm"
                  data-testid="link-to-register"
                >
                  Don't have an account? Sign up
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
