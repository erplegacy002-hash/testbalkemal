import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import nodemailer from "nodemailer";
import { z } from "zod";
import { smtpConfigSchema, sendEmailRequestSchema, type EmailStatus, type SendEmailResponse } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/send-emails", upload.array("attachments", 10), async (req, res) => {
    let sseStarted = false;
    
    try {
      const {
        smtpConfig: smtpConfigStr,
        recipients: recipientsStr,
        subject,
        htmlBody,
        textBody,
        cc: ccStr,
        bcc: bccStr,
      } = req.body;

      let smtpConfig, recipients, cc, bcc;
      
      try {
        smtpConfig = JSON.parse(smtpConfigStr);
        recipients = JSON.parse(recipientsStr);
        cc = ccStr ? JSON.parse(ccStr) : undefined;
        bcc = bccStr ? JSON.parse(bccStr) : undefined;
      } catch (parseError) {
        return res.status(400).json({ message: "Invalid JSON data in request" });
      }

      const requestData = {
        smtpConfig,
        recipients,
        subject,
        htmlBody,
        textBody,
        cc,
        bcc,
      };

      const validationResult = sendEmailRequestSchema.safeParse(requestData);

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validationResult.error.errors,
        });
      }

      const validatedData = validationResult.data;

      const allowedFileTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
      ];

      const attachments: Array<{ filename: string; content: Buffer }> = [];
      
      if (req.files) {
        for (const file of req.files as Express.Multer.File[]) {
          if (!allowedFileTypes.includes(file.mimetype)) {
            return res.status(400).json({
              message: `File type ${file.mimetype} is not allowed for file "${file.originalname}". Allowed types: PDF, images, Word, Excel, text files.`,
            });
          }
          attachments.push({
            filename: file.originalname,
            content: file.buffer,
          });
        }
      }

      const transporter = nodemailer.createTransport({
        host: validatedData.smtpConfig.host,
        port: validatedData.smtpConfig.port,
        secure: false,
        auth: {
          user: validatedData.smtpConfig.username,
          pass: validatedData.smtpConfig.password,
        },
      });

      try {
        await transporter.verify();
      } catch (error) {
        console.error("SMTP verification failed:", error);
        return res.status(401).json({ 
          message: "SMTP authentication failed. Please check your credentials." 
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      sseStarted = true;

      const results: EmailStatus[] = [];
      let totalSent = 0;
      let totalFailed = 0;

      for (const recipient of validatedData.recipients) {
        try {
          res.write(`data: ${JSON.stringify({ email: recipient, status: "sending" })}\n\n`);

          const mailOptions = {
            from: validatedData.smtpConfig.fromEmail,
            to: recipient,
            subject: validatedData.subject,
            html: validatedData.htmlBody,
            text: validatedData.textBody || validatedData.htmlBody.replace(/<[^>]*>/g, ""),
            cc: validatedData.cc,
            bcc: validatedData.bcc,
            attachments,
          };

          await transporter.sendMail(mailOptions);
          
          const sentStatus: EmailStatus = {
            email: recipient,
            status: "sent",
          };
          results.push(sentStatus);
          totalSent++;
          
          res.write(`data: ${JSON.stringify(sentStatus)}\n\n`);
        } catch (error) {
          console.error(`Failed to send email to ${recipient}:`, error);
          const failedStatus: EmailStatus = {
            email: recipient,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          };
          results.push(failedStatus);
          totalFailed++;
          
          res.write(`data: ${JSON.stringify(failedStatus)}\n\n`);
        }
      }

      const response: SendEmailResponse = {
        results,
        totalSent,
        totalFailed,
      };

      res.write(`data: ${JSON.stringify({ type: "complete", data: response })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending emails:", error);
      
      if (sseStarted) {
        res.write(`data: ${JSON.stringify({ 
          type: "error", 
          message: error instanceof Error ? error.message : "Failed to send emails" 
        })}\n\n`);
        res.end();
      } else {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid request data",
            errors: error.errors 
          });
        }

        res.status(500).json({ 
          message: error instanceof Error ? error.message : "Failed to send emails" 
        });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
