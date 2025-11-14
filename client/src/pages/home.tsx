import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Mail,
  Paperclip,
  Eye,
  Send,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  AlertCircle,
} from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  smtpConfigSchema,
  type EmailStatus,
  type SendEmailResponse,
} from "@shared/schema";

const emailFormSchema = z.object({
  smtpUsername: z.string().min(1, "SMTP username is required"),
  smtpPassword: z.string().min(1, "SMTP password is required"),
  subject: z.string().min(1, "Subject is required"),
  htmlBody: z.string().min(1, "Email body is required"),
  recipientsText: z.string().min(1, "At least one recipient is required"),
  cc: z.string().optional(),
  bcc: z.string().optional(),
});

type EmailFormData = z.infer<typeof emailFormSchema>;

export default function Home() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recipients, setRecipients] = useState<string[]>([]);
  const [showCCBCC, setShowCCBCC] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSMTPConfigOpen, setIsSMTPConfigOpen] = useState(true);
  const [emailStatuses, setEmailStatuses] = useState<EmailStatus[]>([]);
  const [isSending, setIsSending] = useState(false);

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      smtpUsername: "",
      smtpPassword: "",
      subject: "",
      htmlBody: "",
      recipientsText: "",
      cc: "",
      bcc: "",
    },
  });

  const parseEmails = (text: string): string[] => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    return matches ? Array.from(new Set(matches)) : [];
  };

  const handleRecipientsChange = (value: string) => {
    form.setValue("recipientsText", value);
    const parsed = parseEmails(value);
    setRecipients(parsed);
  };

  const removeRecipient = (emailToRemove: string) => {
    const currentText = form.getValues("recipientsText");
    const newText = currentText
      .split(/[\s,;\n]+/)
      .filter((item) => item.trim() !== "" && item !== emailToRemove)
      .join("\n");
    form.setValue("recipientsText", newText);
    setRecipients((prev) => prev.filter((e) => e !== emailToRemove));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSSEStream = async (formData: FormData) => {
    const response = await fetch("/api/send-emails", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to send emails");
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("Response body is not readable");
    }

    let buffer = "";
    let completed = false;
    let serverError: Error | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            let data;
            try {
              data = JSON.parse(line.substring(6));
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
              continue;
            }

            if (data.type === "complete") {
              toast({
                title: "Emails Sent",
                description: `Successfully sent ${data.data.totalSent} emails. ${data.data.totalFailed} failed.`,
              });
              completed = true;
            } else if (data.type === "error") {
              serverError = new Error(
                data.message || "Server error during email sending",
              );
              break;
            } else {
              setEmailStatuses((prev) => {
                const index = prev.findIndex((s) => s.email === data.email);
                if (index >= 0) {
                  const updated = [...prev];
                  updated[index] = data;
                  return updated;
                }
                return prev;
              });
            }
          }
        }

        if (serverError) break;
      }

      buffer += decoder.decode(undefined, { stream: false });
    } finally {
      setIsSending(false);
    }

    if (serverError) {
      throw serverError;
    }

    if (!completed) {
      throw new Error("Stream ended unexpectedly without completion message");
    }
  };

  const onSubmit = async (data: EmailFormData) => {
    if (recipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please add at least one valid email address.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();

    const smtpConfig = {
      username: data.smtpUsername,
      password: data.smtpPassword,
      host: "smtp.zeptomail.in",
      port: 587,
      fromEmail: "crmsupport@legacylifespaces.com",
    };

    formData.append("smtpConfig", JSON.stringify(smtpConfig));
    formData.append("recipients", JSON.stringify(recipients));
    formData.append("subject", data.subject);
    formData.append("htmlBody", data.htmlBody);
    formData.append("textBody", data.htmlBody.replace(/<[^>]*>/g, ""));

    const ccEmails = parseEmails(data.cc || "");
    const bccEmails = parseEmails(data.bcc || "");
    if (ccEmails.length > 0) formData.append("cc", JSON.stringify(ccEmails));
    if (bccEmails.length > 0) formData.append("bcc", JSON.stringify(bccEmails));

    attachments.forEach((file) => {
      formData.append("attachments", file);
    });

    const initialStatuses: EmailStatus[] = recipients.map((email) => ({
      email,
      status: "pending" as const,
    }));
    setEmailStatuses(initialStatuses);
    setIsSending(true);

    try {
      await handleSSEStream(formData);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send emails",
        variant: "destructive",
      });
      setIsSending(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ color: [] }, { background: [] }],
      ["link"],
      ["clean"],
    ],
  };

  const handlePreview = async () => {
    const isValid = await form.trigger(["subject", "htmlBody"]);
    if (!isValid) {
      toast({
        title: "Missing Information",
        description: "Please provide both subject and email body.",
        variant: "destructive",
      });
      return;
    }
    setIsPreviewOpen(true);
  };

  const calculateProgress = (): number => {
    if (emailStatuses.length === 0) return 0;
    const sent = emailStatuses.filter((s) => s.status === "sent").length;
    const failed = emailStatuses.filter((s) => s.status === "failed").length;
    const completed = sent + failed;
    return Math.round((completed / emailStatuses.length) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">
              ZeptoMail Bulk Email Sender
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Collapsible
              open={isSMTPConfigOpen}
              onOpenChange={setIsSMTPConfigOpen}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full text-left"
                    data-testid="button-smtp-toggle"
                  >
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">
                            SMTP Configuration
                          </CardTitle>
                          <CardDescription>
                            Configure your ZeptoMail SMTP credentials
                          </CardDescription>
                        </div>
                      </div>
                      {isSMTPConfigOpen ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </CardHeader>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="smtpUsername"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              SMTP Username{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-smtp-username"
                                placeholder="your-smtp-username"
                                disabled={isSending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="smtpPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              SMTP Password{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-smtp-password"
                                type="password"
                                placeholder="your-smtp-password"
                                disabled={isSending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="from-email">From Email</Label>
                      <Input
                        id="from-email"
                        data-testid="input-from-email"
                        type="email"
                        value="crmsupport@legacylifespaces.com"
                        disabled
                        className="cursor-not-allowed bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        This email address is fixed and cannot be changed
                      </p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Compose Email</CardTitle>
                    <CardDescription>Create your email content</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Subject <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-subject"
                              placeholder="Enter email subject"
                              disabled={isSending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="htmlBody"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Email Body{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <div
                              className="border rounded-md"
                              data-testid="editor-email-body"
                            >
                              <ReactQuill
                                theme="snow"
                                value={field.value}
                                onChange={field.onChange}
                                modules={quillModules}
                                className="min-h-64"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Attachments</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSending}
                          data-testid="button-add-attachment"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Add File
                        </Button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                        data-testid="input-file-upload"
                      />
                      {attachments.length > 0 && (
                        <div className="space-y-2">
                          {attachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card"
                              data-testid={`attachment-${index}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm truncate">
                                  {file.name}
                                </span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAttachment(index)}
                                disabled={isSending}
                                data-testid={`button-remove-attachment-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCCBCC(!showCCBCC)}
                        disabled={isSending}
                        data-testid="button-toggle-cc-bcc"
                        className="gap-2"
                      >
                        {showCCBCC ? "Hide" : "Show"} CC/BCC
                      </Button>
                      {showCCBCC && (
                        <div className="space-y-4 pt-2">
                          <FormField
                            control={form.control}
                            name="cc"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CC (Carbon Copy)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    data-testid="input-cc"
                                    placeholder="Enter CC emails (one per line or comma-separated)"
                                    rows={2}
                                    disabled={isSending}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="bcc"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>BCC (Blind Carbon Copy)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    data-testid="input-bcc"
                                    placeholder="Enter BCC emails (one per line or comma-separated)"
                                    rows={2}
                                    disabled={isSending}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recipients</CardTitle>
                    <CardDescription>
                      Paste emails from Excel or enter manually
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="recipientsText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Email Addresses{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              data-testid="input-recipients"
                              placeholder="Paste emails from Excel (one per line, comma-separated, or space-separated)"
                              onChange={(e) =>
                                handleRecipientsChange(e.target.value)
                              }
                              rows={8}
                              className="font-mono text-sm"
                              disabled={isSending}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Supports any format: one per line, comma-separated,
                            or space-separated
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {recipients.length === 0 &&
                      form.getValues("recipientsText") === "" && (
                        <Card className="bg-muted/50">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  How to paste from Excel
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Select email addresses in Excel, copy
                                  (Ctrl+C), and paste here. The system will
                                  automatically detect and validate all email
                                  addresses.
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                    {recipients.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            Parsed Recipients
                          </Label>
                          <Badge
                            variant="secondary"
                            data-testid="badge-recipient-count"
                          >
                            {recipients.length}
                          </Badge>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2 bg-card">
                          {recipients.map((email) => (
                            <div
                              key={email}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-muted/50"
                              data-testid={`recipient-chip-${email}`}
                            >
                              <span className="text-sm truncate">{email}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={() => removeRecipient(email)}
                                disabled={isSending}
                                data-testid={`button-remove-recipient-${email}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={handlePreview}
                        disabled={isSending}
                        data-testid="button-preview"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={isSending || recipients.length === 0}
                        data-testid="button-send"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Emails
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {isSending && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Sending Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Progress
                        value={calculateProgress()}
                        className="h-2"
                        data-testid="progress-send"
                      />
                      <p className="text-sm text-muted-foreground">
                        Sending emails to {recipients.length} recipients...
                      </p>
                      {emailStatuses.length > 0 && (
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {emailStatuses.map((status, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm"
                              data-testid={`status-${status.email}`}
                            >
                              <span className="truncate">{status.email}</span>
                              {status.status === "pending" ? (
                                <Badge
                                  variant="secondary"
                                  className="flex-shrink-0"
                                >
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Pending
                                </Badge>
                              ) : status.status === "sending" ? (
                                <Badge
                                  variant="secondary"
                                  className="flex-shrink-0"
                                >
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Sending
                                </Badge>
                              ) : status.status === "sent" ? (
                                <Badge
                                  variant="secondary"
                                  className="flex-shrink-0"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Sent
                                </Badge>
                              ) : (
                                <Badge
                                  variant="destructive"
                                  className="flex-shrink-0"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Failed
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {!isSending && emailStatuses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Send Results</CardTitle>
                      <CardDescription>
                        {
                          emailStatuses.filter((s) => s.status === "sent")
                            .length
                        }{" "}
                        sent,{" "}
                        {
                          emailStatuses.filter((s) => s.status === "failed")
                            .length
                        }{" "}
                        failed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {emailStatuses.map((status, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm"
                            data-testid={`status-${status.email}`}
                          >
                            <span className="truncate">{status.email}</span>
                            {status.status === "sent" ? (
                              <Badge
                                variant="secondary"
                                className="flex-shrink-0"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Sent
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="flex-shrink-0"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </form>
        </Form>
      </main>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Preview how your email will appear to recipients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                From
              </div>
              <div className="text-sm">crmsupport@legacylifespaces.com</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                To
              </div>
              <div className="text-sm">{recipients.length} recipients</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Subject
              </div>
              <div className="text-lg font-semibold">
                {form.getValues("subject")}
              </div>
            </div>
            <Separator />
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: form.getValues("htmlBody") }}
              data-testid="preview-body"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
