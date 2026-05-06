"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Clock,
  Camera,
  Save,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StandardLayout } from "@/components/ui/standard-layout";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  profileUpdateSchema,
  passwordChangeSchema,
  type ProfileUpdateInput,
  type PasswordChangeInput,
} from "@/lib/validations/profile";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════
// REUSABLE STYLED COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StyledCard({
  children,
  className = "",
  title,
  description,
  titleIcon: TitleIcon,
  headerRight,
  accent = false,
  danger = false,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: string;
  titleIcon?: any;
  headerRight?: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
}) {
  const borderClass = danger
    ? "border-2 border-red-400"
    : accent
      ? "border-l-4 border-l-green-500 border-2 border-green-200 bg-green-50/50"
      : "border-2 border-green-950";

  return (
    <div
      className={`p-5 rounded-xl bg-white transition-all ${borderClass} ${className}`}
    >
      {(title || headerRight) && (
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                {TitleIcon && <TitleIcon className="h-5 w-5" />}
                {title}
              </h3>
            )}
            {description && (
              <p className="text-muted-foreground text-sm mt-1">
                {description}
              </p>
            )}
          </div>
          {headerRight && (
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              {headerRight}
            </div>
          )}
        </div>
      )}
      <div className="space-y-0">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const profileForm = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { name: "", avatarUrl: "" },
  });

  const passwordForm = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        profileForm.reset({
          name: data.name || "",
          avatarUrl: data.avatarUrl || "",
        });
      } else {
        toast.error("Failed to load profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const onProfileSubmit = async (data: ProfileUpdateInput) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        setProfile(result.user);
        await updateSession({ name: result.user.name });
        toast.success("Profile updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update profile");
      }
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordChangeInput) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (response.ok) {
        toast.success("Password changed successfully");
        passwordForm.reset();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to change password");
      }
    } catch (error) {
      toast.error("Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <StandardLayout className="min-h-[87vh]">
        <div className="space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout className="min-h-[87vh]">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Profile & Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account details, security, and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 h-auto p-1 bg-muted border rounded-lg">
            <TabsTrigger
              value="profile"
              className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center justify-center gap-2"
            >
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center justify-center gap-2"
            >
              <Lock className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center justify-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* ==================== Profile Tab ==================== */}
          <TabsContent value="profile" className="space-y-6">
            <StyledCard
              title="Personal Information"
              description="Update your personal details and profile picture"
              titleIcon={User}
              headerRight={
                <Button
                  onClick={profileForm.handleSubmit(onProfileSubmit)}
                  disabled={isSaving}
                  className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </>
                  )}
                </Button>
              }
            >
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                  className="space-y-6"
                >
                  {/* Avatar Section */}
                  <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                    <div className="relative group">
                      <Avatar className="h-24 w-24 border-4 border-white shadow-md group-hover:border-green-100 transition-colors">
                        <AvatarImage
                          src={profile?.avatarUrl || ""}
                          alt={profile?.name || "User"}
                        />
                        <AvatarFallback className="text-2xl bg-green-50 text-green-800 font-bold">
                          {profile?.name
                            ? profile.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)
                            : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full shadow-md hover:bg-green-700 transition-colors"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-foreground">
                        {profile?.name || "User"}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        JPG, PNG or GIF. Max size 2MB.
                      </p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">
                            Full Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your full name"
                              {...field}
                              className="rounded-lg border-slate-300 text-sm"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            This name will be displayed on your profile.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="avatarUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-foreground">
                            Avatar URL
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com/avatar.jpg"
                              {...field}
                              className="rounded-lg border-slate-300 text-sm font-mono"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Paste a link to an image for your avatar.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Hidden submit for the header button */}
                  <button type="submit" className="sr-only">
                    Submit
                  </button>
                </form>
              </Form>
            </StyledCard>
          </TabsContent>

          {/* ==================== Security Tab ==================== */}
          <TabsContent value="security" className="space-y-6">
            <StyledCard
              title="Change Password"
              description="Ensure your account stays secure by using a strong, unique password"
              titleIcon={Lock}
              headerRight={
                <Button
                  onClick={passwordForm.handleSubmit(onPasswordSubmit)}
                  disabled={isSaving}
                  className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" /> Update Password
                    </>
                  )}
                </Button>
              }
            >
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Current Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter current password"
                        {...passwordForm.register("currentPassword")}
                        className="pl-10 pr-10 rounded-lg border-slate-300 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          {...passwordForm.register("newPassword")}
                          className="pl-10 pr-10 rounded-lg border-slate-300 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordForm.formState.errors.newPassword && (
                        <p className="text-xs text-destructive">
                          {passwordForm.formState.errors.newPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          {...passwordForm.register("confirmPassword")}
                          className="pl-10 pr-10 rounded-lg border-slate-300 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordForm.formState.errors.confirmPassword && (
                        <p className="text-xs text-destructive">
                          {
                            passwordForm.formState.errors.confirmPassword
                              .message
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  <button type="submit" className="sr-only">
                    Submit
                  </button>
                </form>
              </Form>
            </StyledCard>

            <StyledCard
              title="Password Requirements"
              description="Your new password must meet the following criteria"
            >
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  "At least 8 characters long",
                  "Contains at least one uppercase letter",
                  "Contains at least one lowercase letter",
                  "Contains at least one number",
                ].map((req, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 text-sm text-muted-foreground"
                  >
                    <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    </div>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </StyledCard>
          </TabsContent>

          {/* ==================== Account Tab ==================== */}
          <TabsContent value="account" className="space-y-6">
            <StyledCard
              title="Account Information"
              description="View your core account details and current status"
              titleIcon={Shield}
            >
              <div className="space-y-1">
                {/* Email */}
                <div className="flex items-center justify-between py-4 group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                      <Mail className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Email Address
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Your primary login email
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-foreground font-medium font-mono">
                    {profile?.email}
                  </span>
                </div>

                <Separator className="bg-slate-100" />

                {/* Role */}
                <div className="flex items-center justify-between py-4 group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Role
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Your permissions level
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`capitalize text-xs ${profile?.role === "admin" ? "bg-red-100 text-red-800 border-red-200" : "bg-blue-100 text-blue-800 border-blue-200"}`}
                  >
                    {profile?.role || "user"}
                  </Badge>
                </div>

                <Separator className="bg-slate-100" />

                {/* Status */}
                <div className="flex items-center justify-between py-4 group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                      <User className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Account Status
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Current activity state
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-xs ${profile?.isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}
                  >
                    {profile?.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <Separator className="bg-slate-100" />

                {/* Created At */}
                <div className="flex items-center justify-between py-4 group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Account Created
                      </p>
                      <p className="text-xs text-muted-foreground">
                        When you originally signed up
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {profile?.createdAt ? formatDate(profile.createdAt) : "N/A"}
                  </span>
                </div>

                <Separator className="bg-slate-100" />

                {/* Last Updated */}
                <div className="flex items-center justify-between py-4 group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Last Updated
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last profile modification
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {profile?.updatedAt ? formatDate(profile.updatedAt) : "N/A"}
                  </span>
                </div>
              </div>
            </StyledCard>

            {/* Danger Zone */}
            <StyledCard
              title={
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  Danger Zone
                </div>
              }
              description="Irreversible and destructive actions"
              danger
            >
              <div className="flex items-center justify-between p-5 rounded-xl border-2 border-red-400 bg-red-50">
                <div>
                  <p className="font-medium text-red-800">Delete Account</p>
                  <p className="text-sm text-red-600 mt-1">
                    Permanently delete your account and all associated data.
                    This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  disabled
                  className="rounded-lg text-sm flex-shrink-0"
                >
                  Delete Account
                </Button>
              </div>
            </StyledCard>
          </TabsContent>
        </Tabs>
      </div>
    </StandardLayout>
  );
}
