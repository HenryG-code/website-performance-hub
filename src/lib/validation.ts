import { z } from "zod";

/**
 * One schema per input, imported by both the client form and the server action
 * that receives it. The client copy gives instant feedback; the server copy is
 * the one that actually protects the database, because a form can be bypassed.
 * The column CHECK constraints in the migration are the third and final layer.
 */

// ------------------------------------------------------------------------ auth

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address.");

/**
 * Supabase enforces a minimum of 6 by default; 8 is a more defensible floor.
 * No composition rules — length beats forced symbols for real-world strength.
 */
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Passwords cannot exceed 72 characters.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your name.")
    .max(80, "Keep your name under 80 characters."),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Both passwords must match.",
    path: ["confirmPassword"],
  });

// -------------------------------------------------------------------- websites

/** Hostname with at least one dot, optional path. Deliberately permissive. */
const HOSTNAME = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s]*)?$/i;

export const websiteUrlSchema = z
  .string()
  .trim()
  .min(1, "Enter the address you want to monitor.")
  .max(2048, "That URL is too long.")
  .refine((value) => HOSTNAME.test(value.replace(/^https?:\/\//i, "")), {
    message: "Enter a valid domain, for example acme.com or www.acme.com/uk.",
  });

export const websiteInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(60, "Keep the name under 60 characters."),
  url: websiteUrlSchema,
  team: z.string().trim().max(40, "Keep the team name under 40 characters."),
  environment: z.enum(["production", "staging"]),
  tags: z.array(z.string().trim().min(1).max(24)).max(5),
});

export type WebsiteInput = z.infer<typeof websiteInputSchema>;

// ---------------------------------------------------------------------- issues

export const issueStatusSchema = z.enum([
  "open",
  "in_progress",
  "resolved",
  "ignored",
]);

// -------------------------------------------------------------------- settings

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your name.")
    .max(80, "Keep your name under 80 characters."),
  role: z.string().trim().max(60, "Keep the role under 60 characters."),
  company: z.string().trim().max(80, "Keep the organisation under 80 characters."),
  timezone: z.string().trim().min(1).max(64),
});

export const notificationPreferencesSchema = z.object({
  auditCompleted: z.boolean(),
  criticalIssues: z.boolean(),
  uptimeIncidents: z.boolean(),
  scoreDrops: z.boolean(),
  weeklyDigest: z.boolean(),
  productUpdates: z.boolean(),
});

export const reportPreferencesSchema = z.object({
  reportTitle: z
    .string()
    .trim()
    .min(1, "Give the report a title.")
    .max(120, "Keep the title under 120 characters."),
  brandName: z.string().trim().max(80, "Keep the brand name under 80 characters."),
  auditFrequency: z.enum(["hourly", "daily", "weekly"]),
  defaultDevice: z.enum(["desktop", "mobile"]),
  scoreThreshold: z.number().int().min(0).max(100),
});

/** Flattens a ZodError into the `{ field: message }` shape the forms render. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
