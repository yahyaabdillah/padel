// PadelHub — Form Builder definitions (seed).
// Forms are localStorage-persisted & editable via the Form Builder. The
// DynamicFormRenderer turns a FormDefinition into UI-kit inputs.

export type FieldType =
  | "text"
  | "number"
  | "money"
  | "textarea"
  | "select"
  | "date"
  | "datetime"
  | "phone"
  | "email"
  | "upload"
  | "checkbox"
  | "radio"
  | "switch";

export interface FieldOption {
  label: string;
  value: string;
}

export interface FormField {
  name: string; // unique key within the form
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: FieldOption[]; // for select / radio
  defaultValue?: string | number | boolean;
  /** layout span out of 12 cols (default 12) */
  colSpan?: 6 | 12;
}

export interface FormDefinition {
  id: string;
  title: string;
  description?: string;
  /** logical "table" / entity this form writes to (dummy) */
  table: string;
  submitLabel?: string;
  fields: FormField[];
}

export const seedForms: FormDefinition[] = [
  {
    id: "form-member-signup",
    title: "New Member Registration",
    description: "Onboard a new player into the club.",
    table: "members",
    submitLabel: "Create Member",
    fields: [
      { name: "fullName", label: "Full Name", type: "text", required: true, placeholder: "e.g. Andi Wijaya", colSpan: 6 },
      { name: "email", label: "Email", type: "email", required: true, placeholder: "name@email.com", colSpan: 6 },
      { name: "phone", label: "Phone", type: "phone", required: true, colSpan: 6 },
      { name: "birthDate", label: "Date of Birth", type: "date", colSpan: 6 },
      {
        name: "tier",
        label: "Membership Tier",
        type: "select",
        required: true,
        colSpan: 6,
        options: [
          { label: "Casual", value: "casual" },
          { label: "Pro", value: "pro" },
          { label: "Elite", value: "elite" },
        ],
        defaultValue: "casual",
      },
      {
        name: "level",
        label: "Skill Level",
        type: "radio",
        colSpan: 6,
        options: [
          { label: "Beginner", value: "beginner" },
          { label: "Intermediate", value: "intermediate" },
          { label: "Advanced", value: "advanced" },
        ],
        defaultValue: "beginner",
      },
      { name: "walletTopup", label: "Initial Wallet Top-up", type: "money", hint: "Optional opening balance", colSpan: 6 },
      { name: "photo", label: "Profile Photo", type: "upload", colSpan: 6 },
      { name: "notes", label: "Notes", type: "textarea", placeholder: "Allergies, preferences, etc.", colSpan: 12 },
      { name: "marketingOptIn", label: "Send promotions via WhatsApp", type: "switch", defaultValue: true, colSpan: 12 },
      { name: "agree", label: "Agrees to club terms & conditions", type: "checkbox", required: true, colSpan: 12 },
    ],
  },
  {
    id: "form-court-booking",
    title: "Court Booking",
    description: "Reserve a court for a session.",
    table: "bookings",
    submitLabel: "Confirm Booking",
    fields: [
      {
        name: "court",
        label: "Court",
        type: "select",
        required: true,
        colSpan: 6,
        options: [
          { label: "Court 1 — Indoor Glass", value: "court-1" },
          { label: "Court 2 — Indoor Glass", value: "court-2" },
          { label: "Court 3 — Outdoor Panoramic", value: "court-3" },
        ],
      },
      { name: "player", label: "Booked By", type: "text", required: true, placeholder: "Member name / walk-in", colSpan: 6 },
      { name: "startTime", label: "Start", type: "datetime", required: true, colSpan: 6 },
      {
        name: "duration",
        label: "Duration (minutes)",
        type: "number",
        required: true,
        defaultValue: 90,
        colSpan: 6,
      },
      {
        name: "type",
        label: "Booking Type",
        type: "radio",
        colSpan: 12,
        options: [
          { label: "Member", value: "member" },
          { label: "Walk-in", value: "walkin" },
          { label: "Open Play", value: "openplay" },
        ],
        defaultValue: "member",
      },
      { name: "rentRacket", label: "Add racket rental", type: "switch", defaultValue: false, colSpan: 12 },
      { name: "note", label: "Note", type: "textarea", placeholder: "Special requests", colSpan: 12 },
    ],
  },
];

export const fieldTypeLabels: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  money: "Money",
  textarea: "Textarea",
  select: "Select",
  date: "Date",
  datetime: "Date & Time",
  phone: "Phone",
  email: "Email",
  upload: "File Upload",
  checkbox: "Checkbox",
  radio: "Radio",
  switch: "Switch",
};
