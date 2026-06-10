export type ProfileCompletionUser = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  username?: string | null;
  phone?: string | null;
  dateOfBirth?: string | Date | null;
  profilePicture?: string | null;
};

export const profileCompletionRequirements = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "email", label: "Email address" },
  { key: "username", label: "Username" },
  { key: "phone", label: "Phone number" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "profilePicture", label: "Profile picture" },
] as const;

const hasProfileValue = (value: unknown) => {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null;
};

export const getProfileCompletion = (user: ProfileCompletionUser | null | undefined) => {
  const items = profileCompletionRequirements.map((requirement) => {
    const complete = hasProfileValue(user?.[requirement.key]);
    return { ...requirement, complete };
  });
  const completed = items.filter((item) => item.complete).length;
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    completed,
    total,
    percent,
    items,
    missingItems: items.filter((item) => !item.complete),
  };
};
