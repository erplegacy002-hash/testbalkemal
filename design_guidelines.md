# Design Guidelines: ZeptoMail Bulk Email Sender

## Design Approach

**Selected System**: Material Design + Productivity Tool Patterns (Linear, Notion)

**Rationale**: This is a utility-focused application requiring clear information hierarchy, efficient form inputs, and status feedback. Drawing from Material Design's form components and Linear's clean dashboard aesthetics ensures professional, functional design.

**Core Principles**:
- Clarity over decoration
- Efficient workflow progression
- Clear visual feedback for actions and status
- Scannable information hierarchy

---

## Typography System

**Font Family**: Inter (Google Fonts)

**Hierarchy**:
- Page Title: text-2xl, font-semibold
- Section Headers: text-lg, font-semibold
- Form Labels: text-sm, font-medium
- Input Text: text-base, font-normal
- Helper Text: text-xs, font-normal
- Status Messages: text-sm, font-medium

---

## Layout System

**Spacing Units**: Use Tailwind units of **2, 4, 6, 8, 12, 16** (e.g., p-4, mb-8, gap-6)

**Container Structure**:
- Main container: max-w-6xl mx-auto px-6 py-8
- Card/Section padding: p-6 to p-8
- Form field spacing: gap-6 between major sections, gap-4 within groups
- Tight spacing for related elements: gap-2

**Grid Layout**:
- Two-column layout for main workspace: Left column (60%) for email composition, Right column (40%) for recipient management and preview
- Single column on mobile (stack vertically)
- Form inputs: Full width within their containers

---

## Component Library

### Navigation Header
- Fixed top bar with application title
- Subtle border-bottom separation
- Padding: px-6 py-4

### Card Components
- Rounded corners: rounded-lg
- Border: border with subtle width
- Shadow: shadow-sm for subtle elevation
- Padding: p-6 for content areas

### Form Inputs

**Text Inputs**:
- Height: h-10 for single-line, h-24 for textarea
- Padding: px-3 py-2
- Border: border, rounded-md
- Focus state: ring-2 outline-none
- Disabled state: Muted appearance with cursor-not-allowed

**Select/Dropdown**:
- Same height and styling as text inputs
- Chevron icon indicator

**File Upload**:
- Dashed border area: border-2 border-dashed rounded-lg
- Padding: p-8
- Upload icon centered with text prompt
- File list below with remove buttons (text-sm, gap-2)

### Buttons

**Primary Action** (Send Emails):
- Padding: px-6 py-2.5
- Rounded: rounded-md
- Font: text-sm font-semibold
- Position: Prominent at top-right of composition area

**Secondary Actions** (Clear, Preview):
- Same size as primary
- Border variant styling

**Icon Buttons** (Remove, Close):
- Size: w-8 h-8
- Rounded: rounded-full
- Icon size: 16px

### Status & Progress

**Email Status List**:
- List items: py-3, border-b last:border-0
- Status badge: Inline rounded-full px-2.5 py-1 text-xs font-medium
- Email address: text-sm, truncate for overflow

**Progress Bar**:
- Height: h-2
- Rounded: rounded-full
- Animated fill for sending progress

### Recipient Input

**Excel Paste Area**:
- Large textarea: min-h-32
- Placeholder text guiding paste format
- Validation feedback below (text-xs)

**Email Pills/Tags**:
- Inline-flex items-center
- Padding: px-2.5 py-1
- Rounded: rounded-md
- Gap between text and remove icon: gap-1.5
- Close icon: w-4 h-4

### Preview Modal/Panel

**Email Preview**:
- Full-width iframe or styled preview area
- Border: border rounded-lg
- Padding: p-4
- Subject displayed as: text-lg font-semibold mb-4
- Body content with proper HTML rendering

---

## Layout Structure

### Main Application Layout

**Top Section** (SMTP Configuration - Collapsible):
- Card component with section header
- Two-column grid (md:grid-cols-2) for username/password fields
- From email field full-width, visually distinct as disabled
- Spacing: gap-4 between inputs

**Middle Section** (Email Composition):
- Left Column (Wider):
  - Subject input (full width)
  - Rich text editor area (min-h-64)
  - Attachment upload zone
  - CC/BCC inputs (collapsible/expandable)
  
- Right Column (Narrower):
  - Recipient management
  - Excel paste textarea
  - Parsed email list with count
  - Preview button prominent

**Bottom Section** (Send Controls):
- Send button (right-aligned)
- Progress indicator appears when sending
- Status list appears below during/after send

### Responsive Behavior

- Desktop (lg): Two-column layout as described
- Tablet (md): Maintain two columns with adjusted ratios
- Mobile: Stack all sections vertically, full-width inputs

---

## Interaction Patterns

**Progressive Disclosure**:
- SMTP config collapsible after initial setup
- CC/BCC fields appear on toggle
- File attachments show expandable list when files added

**Validation Feedback**:
- Inline validation messages below inputs (text-xs, mt-1)
- Email format validation on paste/input
- Required field indicators (text-red-500 asterisk)

**Loading States**:
- Button shows spinner + "Sending..." text
- Disable all inputs during send operation
- Progress bar updates in real-time

---

## Icons

**Library**: Heroicons (via CDN)

**Usage**:
- Mail icon: SMTP config section header
- Paperclip: Attachment button
- X-mark: Remove email/file buttons
- Check-circle/X-circle: Email send status
- Eye: Preview button
- Upload: File upload area

---

## Images

**No hero image required** - This is a functional tool interface focused on productivity, not marketing.