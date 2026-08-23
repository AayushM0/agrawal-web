# ID Card PDF and Triggers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a server-side generated CR80 ID Card PDF download and set up Twilio SMS and SendGrid email notifications on verification.

**Architecture:** We will use `@react-pdf/renderer` in a Next.js App Router API route to generate the PDF securely on the backend. We will integrate `twilio` and `@sendgrid/mail` in the `moderate.ts` Server Actions to trigger notifications upon household approval.

**Tech Stack:** Next.js (App Router), `@react-pdf/renderer`, `twilio`, `@sendgrid/mail`

## Global Constraints

- Must work in a Next.js server environment.
- PDF generated must match standard CR80 ID card dimensions.
- Sensitive environment variables must be used for Twilio and SendGrid.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: N/A
- Produces: Installed packages ready to use.

- [ ] **Step 1: Install `@react-pdf/renderer`, `twilio`, and `@sendgrid/mail`**

```bash
npm install @react-pdf/renderer twilio @sendgrid/mail
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install dependencies for PDF and notifications"
```

---

### Task 2: Create the PDF React Component

**Files:**
- Create: `src/components/PassPDF.tsx`

**Interfaces:**
- Consumes: PassData object
- Produces: `<PassPDF />` component

- [ ] **Step 1: Write the PassPDF component**

```tsx
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    width: "2.125in",
    height: "3.375in",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    padding: 10,
  },
  header: {
    backgroundColor: "#b45309",
    padding: 10,
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 10,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 8,
  },
  body: {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  name: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },
  infoText: {
    fontSize: 8,
    marginBottom: 2,
  },
});

export function PassPDF({ passData }: { passData: any }) {
  return (
    <Document>
      <Page size={[153, 243]} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Maharaja Agrasen Foundation</Text>
          <Text style={styles.subtitle}>Official Member Pass</Text>
        </View>
        <View style={styles.body}>
          {passData.photoUrl && <Image style={styles.photo} src={passData.photoUrl} />}
          <Text style={styles.name}>{passData.fullName}</Text>
          <Text style={styles.infoText}>Role: {passData.roleLabel}</Text>
          <Text style={styles.infoText}>Gotra: {passData.gotra}</Text>
          <Text style={styles.infoText}>City: {passData.currentCity}</Text>
          <Text style={styles.infoText}>Code: {passData.householdCode}</Text>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PassPDF.tsx
git commit -m "feat: add PassPDF renderer component"
```

---

### Task 3: Create the PDF API Route

**Files:**
- Create: `src/app/api/pass/pdf/route.ts`
- Modify: `src/app/dashboard/pass/LanyardPassClient.tsx`

**Interfaces:**
- Consumes: `<PassPDF />`, `memberId` param
- Produces: PDF blob stream

- [ ] **Step 1: Write the API Route**

```typescript
import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { PassPDF } from "@/components/PassPDF";
import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "Missing memberId" }, { status: 400 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await db.getMemberById(memberId);
  const household = await db.getHouseholdById(member.householdId);

  const passData = {
    fullName: member.fullName,
    gotra: household.gotra,
    householdCode: household.householdCode,
    currentCity: member.currentCity,
    roleLabel: member.relationToHead,
    photoUrl: member.photoUrl,
  };

  const stream = await renderToStream(<PassPDF passData={passData} />);
  
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ID_Card_${passData.fullName.replace(/\s+/g, "_")}.pdf"`,
    },
  });
}
```

- [ ] **Step 2: Update the download button in `LanyardPassClient.tsx`**

Replace `onClick={() => window.print()}` with a direct link to the API route:

```tsx
<a
  href={`/api/pass/pdf?memberId=${currentMemberId}`}
  download
  className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
  Download PDF
</a>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pass/pdf/route.ts src/app/dashboard/pass/LanyardPassClient.tsx
git commit -m "feat: API route for PDF and frontend download integration"
```

---

### Task 4: Setup Twilio SMS Notification

**Files:**
- Modify: `src/actions/moderate.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: Twilio environment variables

- [ ] **Step 1: Add Twilio to moderate.ts**

```typescript
import twilio from "twilio";

const twilioClient = process.env.TWILIO_ACCOUNT_SID 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

async function sendSMS(phone: string, text: string) {
  if (!twilioClient) return;
  await twilioClient.messages.create({
    body: text,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });
}
```

Add to `approveHousehold` inside `moderate.ts` (after updating status):

```typescript
  const members = await db.getMembersByHousehold(householdId);
  for (const member of members) {
    if (member.phone) {
      await sendSMS(member.phone, `Your Maharaja Agrasen Foundation membership is approved! Download your official ID here: https://yourdomain.com/dashboard`);
    }
  }
```

- [ ] **Step 2: Update `.env.example`**

```env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
```

- [ ] **Step 3: Commit**

```bash
git add src/actions/moderate.ts .env.example
git commit -m "feat: add Twilio SMS on verification"
```

---

### Task 5: Setup SendGrid Email with Attachment

**Files:**
- Modify: `src/actions/moderate.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: SendGrid environment variables, `@react-pdf/renderer` buffer stream

- [ ] **Step 1: Add SendGrid to moderate.ts**

```typescript
import sgMail from "@sendgrid/mail";
import { renderToBuffer } from "@react-pdf/renderer";
import { PassPDF } from "@/components/PassPDF";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendWelcomeEmail(member: any, household: any) {
  if (!process.env.SENDGRID_API_KEY || !member.email) return;

  const passData = {
    fullName: member.fullName,
    gotra: household.gotra,
    householdCode: household.householdCode,
    currentCity: member.currentCity,
    roleLabel: member.relationToHead,
    photoUrl: member.photoUrl,
  };

  const buffer = await renderToBuffer(<PassPDF passData={passData} />);

  const msg = {
    to: member.email,
    from: "noreply@yourdomain.com",
    subject: "Your Official ID - Maharaja Agrasen Foundation",
    text: "Welcome! Your membership is approved. Your official ID card is attached to this email.",
    attachments: [
      {
        content: buffer.toString("base64"),
        filename: `ID_Card_${passData.fullName.replace(/\s+/g, "_")}.pdf`,
        type: "application/pdf",
        disposition: "attachment",
      }
    ],
  };

  await sgMail.send(msg);
}
```

Call `sendWelcomeEmail(member, updated)` inside the `for` loop in `approveHousehold`.

- [ ] **Step 2: Commit**

```bash
git add src/actions/moderate.ts
git commit -m "feat: add SendGrid email with PDF attachment on verification"
```
