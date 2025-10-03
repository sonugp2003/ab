# Prompt for Building "Roommate Hub" with Next.js, ShadCN, and Supabase

This document provides a comprehensive guide for building a production-quality, two-sided platform called "Roommate Hub" (or "Library Hub"). The application will be built using a modern tech stack: **Next.js** with the App Router, **React**, **TypeScript**, **Tailwind CSS**, and **ShadCN/UI**. The backend will be powered exclusively by **Supabase** for database, authentication, and storage.

The goal is to create a robust, scalable, and aesthetically pleasing application that is ready for production. Pay close attention to detail, user experience, and code quality.

### **1. Core Concept & High-Level Architecture**

The application is a multi-tenant platform that can be configured for two primary use cases:
1.  **Roommate Hub**: For property owners to manage tenants, track rent payments, and send reminders.
2.  **Library Hub**: For librarians to manage students, seat allocation, and fee payments.

The entire user experience and terminology within the app will adapt based on the selected use case.

**Tech Stack:**
*   **Frontend**: Next.js 14+ (App Router), React, TypeScript
*   **UI Framework**: ShadCN/UI components built on Tailwind CSS
*   **Backend-as-a-Service (BaaS)**: Supabase (PostgreSQL Database, Auth, Storage)
*   **Styling**: Tailwind CSS
*   **Form Management**: React Hook Form with Zod for validation
*   **State Management**: React Context API for global state (like the selected use case).
*   **AI/Automation**: Genkit for generating payment reminders.

### **2. Supabase Backend Setup & Schema**

All data will be stored in a Supabase project. You will need to create a new project and use the provided API URL and `anon` key to connect your Next.js application.

#### **2.1. Database Tables**

You must create the following tables in your Supabase PostgreSQL database. These tables are designed to be relational and replace the NoSQL structure of Firestore.

**Table: `profiles`**
This table will store the core information for the "Owner" or "Librarian" roles. It is linked to the `auth.users` table provided by Supabase.

*   `id` (uuid, Primary Key): Foreign key referencing `auth.users.id`. This is the most crucial link.
*   `name` (text, not null)
*   `email` (text, not null, unique): Kept in sync with the `auth.users` email.
*   `mobile_number` (text)
*   `address` (text): The property or library address.
*   `upi_id` (text): The UPI ID for receiving payments.
*   `use_case` (text, not null): Stores either `'room'` or `'library'`. This is critical for filtering.
*   `created_at` (timestamp with time zone, default `now()`)

**Table: `tenants`**
This table stores the "Tenant" or "Student" information. Each tenant is linked to a profile (owner/librarian).

*   `id` (uuid, Primary Key, default `gen_random_uuid()`)
*   `owner_id` (uuid, not null): Foreign key referencing `profiles.id`.
*   `name` (text, not null)
*   `email` (text, not null)
*   `room_or_seat` (text, not null): The room number or library seat identifier.
*   `rent_amount` (numeric, not null, default `0`)
*   `extra_expenses` (numeric, default `0`)
*   `amount_paid` (numeric, not null, default `0`)
*   `debt` (numeric, not null, default `0`): Carried-over balance.
*   `status` (text, not null, default `'unpaid'`): Can be `'paid'`, `'unpaid'`, or `'partial'`.
*   `avatar_url` (text): Generated URL, e.g., from `robohash.org`.
*   `onboarding_code` (text, not null, unique): A system-generated 6-character alphanumeric code.
*   `is_registered` (boolean, not null, default `false`): Tracks if the tenant has completed onboarding.
*   `created_at` (timestamp with time zone, default `now()`)

**Table: `payments`**
This table logs every verified payment for a tenant.

*   `id` (uuid, Primary Key, default `gen_random_uuid()`)
*   `tenant_id` (uuid, not null): Foreign key referencing `tenants.id`.
*   `amount` (numeric, not null)
*   `payment_date` (timestamp with time zone, default `now()`)
*   `recorded_by` (text, not null): `'owner'` or `'tenant'`.

**Table: `messages`**
This table logs payment notifications sent by tenants to owners.

*   `id` (uuid, Primary Key, default `gen_random_uuid()`)
*   `tenant_id` (uuid, not null): Foreign key referencing `tenants.id`.
*   `tenant_name` (text, not null)
*   `amount` (numeric, not null)
*   `status` (text, not null, default `'unread'`): `'unread'`, `'verified'`, or `'rejected'`.
*   `rejection_reason` (text, optional)
*   `created_at` (timestamp with time zone, default `now()`)

#### **2.2. Row Level Security (RLS) Policies**

Supabase's power comes from RLS. You must enable RLS on all tables and create policies that mirror the logic of Firestore's security rules.

*   **`profiles` Table:**
    *   `SELECT`: A user can select their own profile (`auth.uid() = id`).
    *   `INSERT`: A user can insert a profile for themselves (`auth.uid() = id`).
    *   `UPDATE`: A user can update their own profile (`auth.uid() = id`).
*   **`tenants` Table:**
    *   `SELECT`:
        *   An owner can select tenants that belong to them (`owner_id = auth.uid()`).
        *   A tenant (unauthenticated) can select their own profile during login/onboarding if they provide the correct `onboarding_code`.
    *   `INSERT`: An owner can insert a new tenant for themselves (`owner_id = auth.uid()`).
    *   `UPDATE`:
        *   An owner can update their own tenants (`owner_id = auth.uid()`).
        *   An unauthenticated user can "claim" their profile (update `name`, `email`, `is_registered`) if the `onboarding_code` matches and `is_registered` is `false`.
    *   `DELETE`: An owner can delete their own tenants.
*   **`payments` and `messages` Tables:**
    *   Policies should be based on the tenant's owner. An owner can manage `payments` and `messages` for any tenant linked to them. A tenant can only create `messages` for themselves.

#### **2.3. Database Functions & Triggers**

For complex operations like deleting a tenant and all their related data, consider using a PostgreSQL function in Supabase.

*   **`handle_delete_tenant(tenant_id uuid)`**: A function that deletes all records from `payments` and `messages` where `tenant_id` matches, before finally deleting the record from the `tenants` table. This ensures data integrity.

### **3. Application Features & UI/UX**

The application's UI must be modern, professional, and intuitive.

#### **3.1. UI/UX Design Principles ("Cool & Professional Look")**

The professional aesthetic is achieved through a combination of several key elements:

*   **Component Library (ShadCN/UI):** Use ShadCN components as the foundation. They are unstyled, accessible, and can be easily customized. This avoids the "generic Bootstrap" look. Key components to use are `Card`, `Button`, `Input`, `Dialog`, `Avatar`, `DropdownMenu`, and `Table`.
*   **Typography:** Use the `Inter` font (or a similar clean sans-serif) for all text. It's highly readable and modern.
*   **Color Palette:**
    *   **Background:** A very light, off-white (e.g., `#f7f9fa` or `hsl(204, 10%, 98%)`) to create a calm, clean backdrop.
    *   **Primary:** A light, cool blue (e.g., `#7ec4cf` or `hsl(188, 45%, 68%)`) for main actions, links, and highlights. It evokes trust and organization.
    *   **Accent:** A muted orange (e.g., `#ce843c` or `hsl(30, 68%, 52%)`) for secondary but important actions, like "Send Reminder" or warnings.
    *   **Foreground/Text:** A dark, near-black color, but not pure black (e.g., `hsl(222, 84%, 5%)`).
*   **Spacing & Layout:** Be generous with whitespace. Use Tailwind's spacing utilities (`p-`, `m-`, `gap-`) consistently. A container with a `max-w-7xl` and `mx-auto` keeps the content centered and readable on large screens.
*   **Depth and Elevation:** Use subtle shadows (`shadow-md`, `shadow-lg`) on `Card` components to lift them off the background. On hover, increase the shadow (`shadow-xl`) and slightly scale the card (`hover:scale-105`) to provide satisfying visual feedback.
*   **Micro-interactions & Animations:** Use `framer-motion` for subtle page transitions and animations.
    *   Page loads should fade in gently.
    *   Elements can slide in from the bottom (`y: 20, opacity: 0` to `y: 0, opacity: 1`).
    *   Loading spinners (`Loader2` from `lucide-react` with `animate-spin`) should be used in buttons during async operations.
*   **Responsiveness:** The layout must be mobile-first. Use a single-column layout on mobile, transitioning to two or more columns on larger screens using Tailwind's responsive prefixes (`md:`, `lg:`). The owner's tenant list, for example, should be a list of cards on mobile but a data table on desktop.

#### **3.2. Google Authentication with Supabase**

Supabase makes Google Auth straightforward.

1.  **Supabase Dashboard:** In the Authentication -> Providers section, enable Google and enter your Google Cloud OAuth credentials (Client ID and Secret).
2.  **Next.js Code:**
    *   Create a Supabase client instance that is available throughout your app (e.g., in a context or a singleton).
    *   On the Login/Register page, have a "Sign in with Google" button.
    *   The `onClick` handler for this button will call the `supabase.auth.signInWithOAuth()` method:
        ```javascript
        const handleGoogleSignIn = async () => {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`, // Important for redirecting back to the app
            },
          });
          if (error) {
            // Handle error
          }
        };
        ```
    *   Create an `/auth/callback` route in Next.js to handle the user session after they are redirected back from Google. Supabase's client library will handle this automatically.
    *   If a user signs up with Google for the first time, their entry in `auth.users` is created automatically. Your app logic should then check if a corresponding profile exists in your public `profiles` table. If not, redirect them to the "Complete Profile" page to fill in the remaining details (`mobile_number`, `address`, `upi_id`).

#### **3.3. UPI QR Code Generation**

This feature does not require a complex backend. It is achieved by constructing a standardized UPI deep link URL and encoding it into a QR code using a free, public API.

1.  **UPI URL String:** A UPI payment URL has a standard format:
    `upi://pay?pa={upi_id}&pn={payee_name}&am={amount}&cu=INR&tn={transaction_notes}`
    *   `pa`: The Payee Address (the owner's UPI ID). This is the most important part.
    *   `pn`: The Payee Name (the owner's name).
    *   `am`: The amount to be paid.
    *   `cu`: The currency (`INR`).
    *   `tn`: Transaction notes (optional).

2.  **QR Code API:** Use a public QR code generation API like `api.qrserver.com`.
    *   The API endpoint takes the string you want to encode as a URL parameter.
    *   Example: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=YOUR_URL_ENCODED_UPI_STRING`

3.  **Implementation:**
    *   In the tenant's "Make a Payment" dialog, after the tenant enters an amount:
    *   Construct the UPI string using the owner's `upi_id` and name, and the amount entered by the tenant.
    *   **URL-encode** this entire UPI string.
    *   Construct the final QR code image URL using the `api.qrserver.com` endpoint.
    *   Display this URL in an `<img>` tag. When the tenant scans this with any UPI-enabled app (Google Pay, PhonePe, etc.), their app will be pre-filled with all the payment details.

#### **3.4. Feature Breakdown**

Implement the following pages and components:

*   **Use Case Selection Page (`/`)**: The initial landing page where the user chooses between "Roommate Hub" and "Library Hub". This choice is saved in `localStorage` and a React Context to drive the terminology throughout the app.

*   **Owner/Librarian Authentication (`/owner/login`, `/owner/register`)**:
    *   Forms for email/password login and registration.
    *   "Sign in with Google" button.
    *   Logic to handle both new user registration (inserting into `profiles`) and login.
    *   "Forgot Password" flow using Supabase's `sendPasswordResetEmail()` method.

*   **Owner Dashboard (`/owner/dashboard`)**:
    *   **Summary Stats:** Cards showing Total Tenants, Paid Count, Unpaid Count, and Total Revenue. These are calculated by querying the `tenants` table.
    *   **Tenant List:** A responsive list (cards on mobile, table on desktop) of all tenants linked to the owner. It should display key info like name, room, and payment status.
    *   **Filtering:** Allow the owner to filter the tenant list by status (all, paid, unpaid).
    *   **Actions Menu (per tenant):**
        *   **Record Payment:** A dialog to manually enter a payment, which inserts a record into the `payments` table and updates the `tenants` table (`amount_paid`, `status`).
        *   **Mark as Paid/Unpaid:** Quick actions to update a tenant's status for a payment cycle.
        *   **View History:** A dialog that shows a chronological list of transactions from the `payments` table for that tenant.
        *   **Send Reminder (AI Feature):**
            *   When clicked, this should call a Next.js Server Action.
            *   The Server Action uses **Genkit** to call a generative AI model (like Gemini).
            *   The prompt should instruct the model to write a polite, slightly varied rent reminder email, using the tenant's name, owner's name, and outstanding amount as variables.
            *   The generated email body and subject are then sent using a service like **EmailJS** or **Resend**.
        *   **Edit/Delete Tenant:** Dialogs to update or delete a tenant's record. Deletion should use the `handle_delete_tenant` database function to ensure all related data is removed.
    *   **Payment Notifications:** A real-time list of `unread` records from the `messages` table. The owner can "Verify" (which opens the Record Payment dialog) or "Reject" (which updates the message with a rejection reason).

*   **Tenant/Student Onboarding & Login (`/tenant/onboarding`, `/tenant/login`)**:
    *   **Onboarding:** A form for `onboarding_code`, `fullName`, and `email`. On submit, the app searches the `tenants` table for the code. If found and not yet registered, it updates the record with the new details and sets `is_registered` to `true`.
    *   **Login:** A single input for the `onboarding_code`. If a registered user is found, their `tenant.id` and `owner_id` are saved to `localStorage` or a secure cookie to act as their "session".

*   **Tenant Dashboard (`/tenant/dashboard`)**:
    *   **Payment Status Card:** A large, clear card showing if they are 'Paid' or 'Unpaid'. If unpaid, it should show Total Due, Amount Paid, and Remaining Balance.
    *   **Make a Payment Button:** Opens a dialog that contains:
        *   The owner's UPI ID (with a copy button).
        *   An input for the amount the tenant is paying.
        *   The "Generate QR Code" button, which implements the logic described in section 3.3.
        *   A "Notify After Payment" button, which allows the tenant to send a notification to the owner by creating a new record in the `messages` table.
    *   **Activity Feed:** A real-time list showing their payment history (`payments` table) and notification history (`messages` table), sorted chronologically.

By following this detailed prompt, you will be able to successfully replicate the "Roommate Hub" application using the powerful and modern combination of Next.js and Supabase.
