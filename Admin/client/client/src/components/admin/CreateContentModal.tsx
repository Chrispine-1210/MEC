import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import RichTextEditor from "./RichTextEditor";
import ImageUpload from "./ImageUpload";
import { X, Plus } from "lucide-react";

const baseContentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  content: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featuredImage: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const scholarshipSchema = baseContentSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  deadline: z.string().min(1, "Deadline is required"),
  eligibility: z.string().min(1, "Eligibility criteria is required"),
  applicationUrl: z.string().url("Must be a valid URL").optional(),
  requirements: z.array(z.string()).default([]),
  university: z.string().optional(),
  fieldOfStudy: z.string().optional(),
});

const jobSchema = baseContentSchema.extend({
  company: z.string().min(1, "Company is required"),
  location: z.string().min(1, "Location is required"),
  jobType: z.enum(["full-time", "part-time", "contract", "internship"]),
  salary: z.string().optional(),
  applicationUrl: z.string().url("Must be a valid URL").optional(),
  skills: z.array(z.string()).default([]),
  experience: z.string().optional(),
  remote: z.boolean().default(false),
});

const partnerSchema = baseContentSchema.extend({
  website: z.string().url("Must be a valid URL").optional(),
  contactEmail: z.string().email("Must be a valid email").optional(),
  country: z.string().min(1, "Country is required"),
  partnerType: z.enum(["university", "organization", "company", "government"]),
  services: z.array(z.string()).default([]),
});

const blogSchema = baseContentSchema.extend({
  excerpt: z.string().optional(),
  readingTime: z.number().optional(),
  category: z.string().min(1, "Category is required"),
  publishedAt: z.string().optional(),
});

const teamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  position: z.string().min(1, "Position is required"),
  bio: z.string().optional(),
  email: z.string().email("Must be a valid email").optional(),
  profileImage: z.string().optional(),
  skills: z.array(z.string()).default([]),
  socialLinks: z.object({
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
    github: z.string().optional(),
  }).optional(),
});

type ContentType = "scholarship" | "job" | "partner" | "blog" | "team";

interface CreateContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: ContentType;
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export default function CreateContentModal({
  isOpen,
  onClose,
  contentType,
  onSubmit,
  loading = false,
}: CreateContentModalProps) {
  const [currentTag, setCurrentTag] = useState("");
  const [currentSkill, setCurrentSkill] = useState("");

  const getSchema = () => {
    switch (contentType) {
      case "scholarship": return scholarshipSchema;
      case "job": return jobSchema;
      case "partner": return partnerSchema;
      case "blog": return blogSchema;
      case "team": return teamSchema;
      default: return baseContentSchema;
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: getDefaultValues(),
  });

  function getDefaultValues() {
    const base = {
      title: "",
      description: "",
      content: "",
      status: "draft" as const,
      featuredImage: "",
      tags: [],
    };

    switch (contentType) {
      case "scholarship":
        return { ...base, amount: "", deadline: "", eligibility: "", requirements: [], university: "", fieldOfStudy: "" };
      case "job":
        return { ...base, company: "", location: "", jobType: "full-time" as const, skills: [], experience: "", remote: false };
      case "partner":
        return { ...base, website: "", contactEmail: "", country: "", partnerType: "university" as const, services: [] };
      case "blog":
        return { ...base, excerpt: "", category: "", readingTime: 0 };
      case "team":
        return { name: "", position: "", bio: "", email: "", profileImage: "", skills: [], socialLinks: {} };
      default:
        return base;
    }
  }

  const addTag = () => {
    if (currentTag.trim() && !form.getValues("tags")?.includes(currentTag.trim())) {
      const currentTags = form.getValues("tags") || [];
      form.setValue("tags", [...currentTags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  const addSkill = (fieldName: "skills" | "requirements" | "services") => {
    if (currentSkill.trim() && !form.getValues(fieldName)?.includes(currentSkill.trim())) {
      const currentSkills = form.getValues(fieldName) || [];
      form.setValue(fieldName, [...currentSkills, currentSkill.trim()]);
      setCurrentSkill("");
    }
  };

  const removeSkill = (skillToRemove: string, fieldName: "skills" | "requirements" | "services") => {
    const currentSkills = form.getValues(fieldName) || [];
    form.setValue(fieldName, currentSkills.filter(skill => skill !== skillToRemove));
  };

  const getTitle = () => {
    const titles = {
      scholarship: "Create New Scholarship",
      job: "Create New Job Opportunity",
      partner: "Add New Partner",
      blog: "Create New Blog Post",
      team: "Add New Team Member",
    };
    return titles[contentType];
  };

  const handleSubmit = (data: any) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="create-content-modal">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">{getTitle()}</DialogTitle>
          <DialogDescription>
            Fill in the details below to create new content.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Fields */}
              {contentType !== "team" && (
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter title..." {...field} data-testid="input-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {contentType === "team" && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name..." {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input placeholder="Job title..." {...field} data-testid="input-position" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Content-specific fields */}
              {contentType === "scholarship" && (
                <>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. $10,000" {...field} data-testid="input-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Deadline</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-deadline" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {contentType === "job" && (
                <>
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input placeholder="Company name..." {...field} data-testid="input-company" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="City, Country..." {...field} data-testid="input-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-job-type">
                              <SelectValue placeholder="Select job type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="full-time">Full Time</SelectItem>
                            <SelectItem value="part-time">Part Time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="internship">Internship</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Status field for content */}
              {contentType !== "team" && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Description/Bio field */}
            <FormField
              control={form.control}
              name={contentType === "team" ? "bio" : "description"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{contentType === "team" ? "Bio" : "Description"}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={contentType === "team" ? "Brief biography..." : "Brief description..."}
                      className="min-h-[100px]"
                      {...field}
                      data-testid={contentType === "team" ? "textarea-bio" : "textarea-description"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content field for non-team content */}
            {contentType !== "team" && (
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Write your content here..."
                        data-testid="rich-text-editor"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Image upload */}
            <FormField
              control={form.control}
              name={contentType === "team" ? "profileImage" : "featuredImage"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{contentType === "team" ? "Profile Image" : "Featured Image"}</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      data-testid="image-upload"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dynamic array fields */}
            {(form.getValues("tags") !== undefined) && (
              <div>
                <FormLabel>Tags</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.watch("tags")?.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1" data-testid={`tag-${index}`}>
                      {tag}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    data-testid="input-new-tag"
                  />
                  <Button type="button" onClick={addTag} size="sm" data-testid="button-add-tag">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} data-testid="button-create">
                {loading ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}