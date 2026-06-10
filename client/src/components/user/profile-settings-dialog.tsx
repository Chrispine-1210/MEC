import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, Circle, Loader2, Save, Trash2, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { type User, useAuth } from "@/hooks/use-auth";
import { getProfileCompletion } from "@/lib/profile-completion";

type ProfileSettingsDialogProps = {
  user: User;
  children: ReactNode;
};

type ProfileFormState = {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  dateOfBirth: string;
};

const allowedProfileImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxProfileImageBytes = 5 * 1024 * 1024;

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getInitials = (user: User) =>
  `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "ME";

export default function ProfileSettingsDialog({ user, children }: ProfileSettingsDialogProps) {
  const { updateProfile, uploadProfilePicture } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProfileFormState>({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    username: user.username ?? "",
    phone: user.phone ?? "",
    dateOfBirth: toDateInputValue(user.dateOfBirth ?? null),
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const completion = useMemo(() => getProfileCompletion(user), [user]);

  useEffect(() => {
    if (!open) return;
    setForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      username: user.username ?? "",
      phone: user.phone ?? "",
      dateOfBirth: toDateInputValue(user.dateOfBirth ?? null),
    });
    setFieldErrors({});
  }, [open, user]);

  const updateField = (field: keyof ProfileFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.firstName.trim()) errors.firstName = "First name is required";
    if (!form.lastName.trim()) errors.lastName = "Last name is required";
    if (!/^[a-zA-Z0-9._-]{3,80}$/.test(form.username.trim())) {
      errors.username = "Use 3-80 letters, numbers, dots, underscores, or hyphens";
    }
    if (form.phone.trim() && !/^[+()0-9\s.-]+$/.test(form.phone.trim())) {
      errors.phone = "Use numbers, spaces, +, parentheses, dots, or hyphens";
    }
    if (form.dateOfBirth) {
      const selectedDate = new Date(form.dateOfBirth);
      if (Number.isNaN(selectedDate.getTime()) || selectedDate.getTime() > Date.now()) {
        errors.dateOfBirth = "Enter a valid date that is not in the future";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        phone: form.phone.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
      });
      toast({
        title: "Profile updated",
        description: "Your account details and completion score are up to date.",
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Profile update failed",
        description: error instanceof Error ? error.message : "Please review your details and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!allowedProfileImageTypes.has(file.type)) {
      toast({
        title: "Unsupported image",
        description: "Upload a JPG, PNG, or WEBP profile picture.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxProfileImageBytes) {
      toast({
        title: "Image too large",
        description: "Profile pictures must be 5MB or smaller.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      await uploadProfilePicture(file);
      toast({
        title: "Profile picture updated",
        description: "Your new picture is now visible on your account.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please choose another image and try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    setIsUploading(true);
    try {
      await updateProfile({ profilePicture: null });
      toast({
        title: "Profile picture removed",
        description: "Your account now uses your initials.",
      });
    } catch (error) {
      toast({
        title: "Could not remove picture",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Account Profile</DialogTitle>
          <DialogDescription>
            Keep your account details complete so applications and event registrations can be prefilled accurately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <section className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4 text-center">
              <Avatar className="h-24 w-24 border border-border bg-background">
                <AvatarImage src={user.profilePicture || ""} alt={`${user.firstName} ${user.lastName}`} />
                <AvatarFallback className="text-xl font-bold text-mtendere-blue">
                  {user.profilePicture ? <UserRound className="h-8 w-8" /> : getInitials(user)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <p className="font-semibold text-foreground">{user.firstName} {user.lastName}</p>
                <p className="break-all text-xs text-muted-foreground">{user.email}</p>
              </div>

              <div className="grid w-full gap-2">
                <Label
                  htmlFor="profile-picture-upload"
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-mtendere-blue px-3 text-sm font-semibold text-white hover:bg-mtendere-blue/90"
                >
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                  Upload Photo
                </Label>
                <Input
                  id="profile-picture-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={isUploading || isSaving}
                  onChange={handleImageChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isUploading || isSaving || !user.profilePicture}
                  onClick={handleRemovePicture}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Photo
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Completion</p>
                <Badge variant="outline">{completion.percent}%</Badge>
              </div>
              <Progress value={completion.percent} className="h-2" />
              <div className="mt-4 space-y-2">
                {completion.items.map((item) => (
                  <div key={item.key} className="flex items-center gap-2 text-sm">
                    {item.complete ? (
                      <CheckCircle2 className="h-4 w-4 text-mtendere-green" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={item.complete ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="profile-first-name"
                label="First name"
                value={form.firstName}
                error={fieldErrors.firstName}
                autoComplete="given-name"
                onChange={(value) => updateField("firstName", value)}
              />
              <Field
                id="profile-last-name"
                label="Last name"
                value={form.lastName}
                error={fieldErrors.lastName}
                autoComplete="family-name"
                onChange={(value) => updateField("lastName", value)}
              />
            </div>

            <Field
              id="profile-username"
              label="Username"
              value={form.username}
              error={fieldErrors.username}
              autoComplete="username"
              onChange={(value) => updateField("username", value)}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="profile-phone"
                label="Phone number"
                value={form.phone}
                error={fieldErrors.phone}
                autoComplete="tel"
                placeholder="+265 ..."
                onChange={(value) => updateField("phone", value)}
              />
              <Field
                id="profile-date-of-birth"
                label="Date of birth"
                type="date"
                value={form.dateOfBirth}
                error={fieldErrors.dateOfBirth}
                autoComplete="bday"
                onChange={(value) => updateField("dateOfBirth", value)}
              />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving || isUploading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-mtendere-green text-white hover:bg-mtendere-green/90" disabled={isSaving || isUploading}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Profile
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
