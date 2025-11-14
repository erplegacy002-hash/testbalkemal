import { z } from "zod";

export const smtpConfigSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  host: z.string().default("smtp.zeptomail.in"),
  port: z.number().default(587),
  fromEmail: z.string().email().default("crmsupport@legacylifespaces.com"),
});

export type SMTPConfig = z.infer<typeof smtpConfigSchema>;

export const emailRecipientSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
});

export type EmailRecipient = z.infer<typeof emailRecipientSchema>;

export const sendEmailRequestSchema = z.object({
  smtpConfig: smtpConfigSchema,
  recipients: z
    .array(z.string().email())
    .min(1, "At least one recipient is required"),
  subject: z.string().min(1, "Subject is required"),
  htmlBody: z.string().min(1, "Email body is required"),
  textBody: z.string().optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
});

export type SendEmailRequest = z.infer<typeof sendEmailRequestSchema>;

export const emailStatusSchema = z.object({
  email: z.string().email(),
  status: z.enum(["pending", "sending", "sent", "failed"]),
  error: z.string().optional(),
});

export type EmailStatus = z.infer<typeof emailStatusSchema>;

export const sendEmailResponseSchema = z.object({
  results: z.array(emailStatusSchema),
  totalSent: z.number(),
  totalFailed: z.number(),
});

export type SendEmailResponse = z.infer<typeof sendEmailResponseSchema>;

export type User = {
  id: string;
  username: string;
  password: string;
};

export type InsertUser = Omit<User, "id">;
