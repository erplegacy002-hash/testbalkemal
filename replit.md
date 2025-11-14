# ZeptoMail Bulk Email Sender

## Overview
A professional bulk email sender application using ZeptoMail SMTP with Excel paste support, real-time progress tracking, and comprehensive email features.

## Recent Changes
**November 14, 2025**
- Implemented complete bulk email sender with ZeptoMail SMTP integration
- Added Server-Sent Events (SSE) for real-time progress updates
- Built beautiful, responsive UI with Material Design principles
- Implemented schema-based validation with Zod
- Added file attachment support with type validation

## Key Features
- **SMTP Configuration**: Secure ZeptoMail SMTP setup with credential validation
- **Fixed From Email**: crmsupport@legacylifespaces.com (disabled for editing)
- **Excel Paste Support**: Paste email addresses directly from Excel in any format
- **Email Validation**: Automatic email parsing and validation
- **Rich Text Editor**: Full-featured HTML email composer with React Quill
- **File Attachments**: Support for PDF, images, Office documents, text files (max 10MB)
- **CC/BCC Fields**: Optional carbon copy and blind carbon copy support
- **Email Preview**: Preview emails before sending
- **Real-Time Progress**: Server-Sent Events stream progress updates as each email is sent
- **Batch Sending**: Send to multiple recipients with individual status tracking
- **Error Handling**: Comprehensive error messages and validation feedback

## Project Architecture
### Frontend (`client/`)
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **UI Library**: Shadcn UI components with Tailwind CSS
- **Rich Text**: React Quill for HTML email composition
- **State Management**: TanStack Query for server state
- **Styling**: Tailwind CSS with Inter font, Material Design principles

### Backend (`server/`)
- **Framework**: Express.js with TypeScript
- **Email Sending**: Nodemailer with SMTP transport
- **File Uploads**: Multer (in-memory storage, 10MB limit)
- **Validation**: Zod schemas shared between frontend and backend
- **Real-Time Updates**: Server-Sent Events (SSE) for progress streaming

### Shared (`shared/`)
- **Schemas**: TypeScript types and Zod validation schemas
- **Data Models**: SMTP config, email request/response, status tracking

## Technical Details
### SMTP Integration
- Host: smtp.zeptomail.com
- Port: 587
- Authentication: Username/password via user input
- Verification: SMTP connection verified before sending

### File Upload Handling
- Storage: In-memory (Multer)
- Size Limit: 10MB per file
- Max Files: 10 attachments
- Allowed Types: PDF, JPEG, PNG, GIF, Word, Excel, text, CSV

### Real-Time Progress
- Technology: Server-Sent Events (SSE)
- Updates: "pending" → "sending" → "sent"/"failed"
- Progress Bar: Dynamically calculated from status distribution
- Error Handling: SSE-formatted errors, proper stream cleanup

## User Preferences
- Clean, professional interface
- Material Design aesthetic
- Responsive layout (desktop/tablet/mobile)
- Minimal spacing and clear visual hierarchy
- Real-time feedback for all actions

## Running the Project
```bash
npm run dev
```
This starts both Express backend (port 5000) and Vite frontend development server.

## Environment Variables
- `SESSION_SECRET`: Session security (already configured)
- No additional secrets required - SMTP credentials entered via UI

## Database
This application is stateless and does not require a database. All email sending is done in real-time without persistence.

## Known Issues
- ReactQuill shows findDOMNode deprecation warning (library issue, doesn't affect functionality)

## Next Steps / Future Enhancements
- Email template library with save/load functionality
- Email scheduling for delayed sends
- Delivery reports with bounce tracking
- Recipient list management with groups
- Email personalization with merge tags
- CSV import/export for recipient lists
