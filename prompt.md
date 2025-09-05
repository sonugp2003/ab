# Prompt for Building the "Roommate Hub" Android Application (Java)

I want to build a native Android application using **Java** in **Android Studio**. The application will be a two-sided platform that can switch between two use cases: a "Roommate Hub" for property owners and tenants, and a "Library Hub" for librarians and students. The app must be production-quality, with a clean, modern user interface, and all data will be stored and managed using an existing **Google Firebase** project.

When you write the code, you must specify the full file path for each file you create or modify (e.g., `app/src/main/java/com/example/roommatehub/OwnerLoginActivity.java` or `app/src/main/res/layout/activity_owner_login.xml`).

### **1. Core Concept & Backend**

The app's backend is already established using **Firebase**. You will not need to create a new backend.

*   **Authentication:** Use **Firebase Authentication** for user login and registration. This will be for the "Owner" / "Librarian" roles only.
*   **Database:** Use **Firebase Firestore** as the database. You will connect to and perform all data operations (read, write, update, delete) on an existing Firestore instance.

### **2. Firestore Database Schema**

You must adhere to the following Firestore data structure. This is critical as it's the same structure used by the existing web application.

*   **Root Collections (for Owners/Librarians):**
    *   `roomOwners` (for the Roommate Hub use case)
    *   `librarians` (for the Library Hub use case)
    *   **Fields:**
        *   `uid` (string): The Firebase Auth User ID.
        *   `name` (string): User's full name.
        *   `email` (string): User's email.
        *   `mobileNumber` (string): 10-digit mobile number.
        *   `address` (string): Property or Library address.
        *   `upiId` (string): The UPI ID for receiving payments/fees.

*   **Subcollections (for Tenants/Students):**
    *   Nested under each owner/librarian document (e.g., `/roomOwners/{ownerId}/tenants`).
    *   **Collection Names:** `tenants` or `students`.
    *   **Fields:**
        *   `name` (string): Tenant/Student's full name.
        *   `email` (string): Tenant/Student's email.
        *   `room` (string): Room identifier or Seat Number.
        *   `rentAmount` (number): Base rent or fee.
        *   `extraExpenses` (number, optional): Additional charges.
        *   `amountPaid` (number): Amount paid for the current cycle.
        *   `debt` (number): Outstanding balance carried over from previous cycles.
        *   `status` (string): 'paid', 'unpaid', or 'partial'.
        *   `avatar` (string): URL to a generated avatar. **Idea:** This can be generated on the client side using a service like `https://robohash.org/{email}`.
        *   `roomCode` (string): A unique, system-generated 6-character alphanumeric code (or Student ID). This is permanent and cannot be changed.
        *   `isRegistered` (boolean): `false` by default, `true` after the tenant/student completes onboarding.
        *   `createdAt` (Timestamp): The Firestore timestamp when the user was added.

*   **Payment & Message Subcollections:**
    *   `payments`: Nested under each tenant/student, it records verified payments. Fields: `amount` (number), `paymentDate` (Timestamp), `recordedBy` (string: 'owner' or 'tenant').
    *   `messages`: Nested under each tenant/student, it handles payment notifications. Fields: `amount` (number), `tenantName` (string), `status` (string: 'unread', 'verified', 'rejected'), `rejectionReason` (string, optional), `createdAt` (Timestamp).

### **3. App-wide Features & UI/UX**

*   **UI Design:** Use **Material Design 3** components. The app should have a professional look with rounded corners, shadows for depth, and a consistent color scheme.
*   **Theming:** Implement both Light and Dark themes.
*   **Responsiveness:** All screens must be fully responsive and work on various phone and tablet sizes.
*   **Loading States:** For any operation that fetches data from Firestore, display a `ProgressBar` to indicate loading. Buttons that trigger an operation should become disabled and show a loading indicator.
*   **Error Handling:** Use dialogs or `Toast` messages to show clear, user-friendly error messages from Firebase or network failures.

### **4. Detailed Feature Implementation**

#### **4.1. Use Case Selection Screen**
*   **File:** `activity_use_case_selection.xml`, `UseCaseSelectionActivity.java`
*   **Functionality:** This is the first screen the user sees. It presents two large, clickable cards: "Roommate Hub" and "Library Hub". When a user selects a use case, save this choice to Android's `SharedPreferences` so the app remembers their choice on next launch. After selection, navigate to the appropriate login page.

#### **4.2. Owner / Librarian Role**

##### **Authentication & Onboarding**
*   **Registration Screen:**
    *   **Files:** `activity_register.xml`, `RegisterActivity.java`
    *   **Functionality:** A form with fields for Name, Email, Password, Mobile, Address, and UPI ID.
    *   On submission, first, call Firebase Auth's `createUserWithEmailAndPassword`. If it fails with `auth/email-already-in-use`, that's okay. Log the user in with `signInWithEmailAndPassword` to get their UID.
    *   Then, create a new document in the appropriate Firestore collection (`roomOwners` or `librarians`) with the form data and the user's UID. This logic ensures a user can have both an owner and librarian role with the same email.

*   **Login Screen:**
    *   **Files:** `activity_login.xml`, `LoginActivity.java`
    *   **Functionality:** Standard email and password login using Firebase Auth's `signInWithEmailAndPassword`. On success, navigate to the dashboard. Include a "Forgot Password?" link.

*   **Forgot Password:**
    *   **Files:** `activity_forgot_password.xml`, `ForgotPasswordActivity.java`
    *   **Functionality:** A form with one email field. Use Firebase Auth's `sendPasswordResetEmail`. This sends a secure link to the user. Show a confirmation message telling the user to check their email.

##### **Dashboard**
*   **Files:** `activity_owner_dashboard.xml`, `OwnerDashboardActivity.java`
*   **Layout:** A main screen with summary stats at the top and a list of tenants/students below.
*   **Summary Stats:** Four `CardView`s showing: Total Revenue/Fees, Total Tenants/Students, Paid Count, Unpaid/Partial Count.
*   **Tenant/Student List:** Use a `RecyclerView` to display the list of tenants/students. Each item in the list should be a `CardView` showing the user's name, avatar, room/seat, and payment status.
*   **Payment Status:** Use a small, colored indicator or `Chip` to show status: green for 'paid', red for 'unpaid', amber for 'partial'.
*   **Actions Menu:** Each item in the `RecyclerView` should have a popup menu (three-dot icon) with these actions:
    1.  **Record Payment:** Opens a dialog to manually enter a payment.
    2.  **Mark as Paid:** Sets `amountPaid` to the total due and `debt` to 0.
    3.  **Mark as Unpaid:** Adds the current balance (`rentAmount + extraExpenses - amountPaid`) to the existing `debt` field, then resets `amountPaid` to 0 for the new cycle.
    4.  **View History:** Opens a dialog showing a list of all transactions from the `payments` subcollection.
    5.  **Edit Tenant/Student:** Opens a dialog to edit details (Name, Email, Rent/Fee). The `roomCode`/`studentID` **cannot** be edited.
    6.  **Delete Tenant/Student:** Shows a confirmation dialog, then deletes the user's document and all documents in their `payments` and `messages` subcollections.

*   **Payment Notifications:** Display a list of unread messages from the `messages` subcollection, fetched in real-time. Each notification shows the tenant/student name and claimed amount, with "Verify" and "Reject" buttons.
    *   **Verify:** Opens the "Record Payment" dialog, pre-filled with the claimed amount.
    *   **Reject:** Opens a dialog to enter a `rejectionReason`, which then updates the message document.

#### **4.3. Tenant / Student Role**

##### **Authentication & Onboarding**
*   **Onboarding Screen:**
    *   **Files:** `activity_tenant_onboarding.xml`, `TenantOnboardingActivity.java`
    *   **Functionality:** A form for Room Code/Student ID, Full Name, and Email.
    *   **Logic:** On submit, the app must search for the entered `roomCode` across all `tenants`/`students` subcollections. **Idea:** This must be done by first fetching all owner/librarian documents, then querying the subcollection of each one. This avoids needing a special Firestore index. If found and `isRegistered` is `false`, update the document with the new name/email and set `isRegistered` to `true`.

*   **Login Screen:**
    *   **Files:** `activity_tenant_login.xml`, `TenantLoginActivity.java`
    *   **Functionality:** A single field for the `roomCode`/`studentID`.
    *   **Logic:** Use the same search logic as onboarding. If a matching, registered user is found, save the full Firestore document path (e.g., `roomOwners/abc/tenants/xyz`) to `SharedPreferences` and navigate to the tenant dashboard. If not registered, show a message and redirect to onboarding.

##### **Dashboard**
*   **Files:** `activity_tenant_dashboard.xml`, `TenantDashboardActivity.java`
*   **Functionality:** A clean, single-page view.
*   **Payment Status Card:** A large `CardView` that is the main feature.
    *   If `status` is 'paid', show a large checkmark icon and a success message.
    *   If `status` is 'unpaid' or 'partial', show Total Due, Amount Paid, and Remaining Balance.
*   **Make a Payment Button:** Opens a dialog.
*   **Payment Dialog:**
    1.  Shows the owner's UPI ID with a copy button.
    2.  An `EditText` for the user to enter the amount they are paying.
    3.  A **"Generate QR Code" button**. **Idea:** This is done by constructing a UPI payment URL (e.g., `upi://pay?pa={upiId}&pn={name}&am={amount}`) and feeding it to a QR code generator API, like `api.qrserver.com`. You will need to make an HTTP request to this API (using a library like **Picasso** or **Glide** on Android) to fetch the QR image and display it in an `ImageView`.
    4.  A **"Notify After Payment" button**. This button opens a final confirmation dialog, then creates a new document in the `messages` subcollection with the amount paid and `status: 'unread'`.
*   **Activity Feed:** A `RecyclerView` that listens in real-time to both the `payments` and `messages` subcollections for that user. It shows a chronological list of:
    *   Verified payments (green icon).
    *   Sent notifications (amber icon).
    *   Rejected notifications (red icon), including the `rejectionReason`.