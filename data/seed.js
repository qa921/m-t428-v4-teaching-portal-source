// Seed data reconciled from docs/* prior-state fixtures (asOf 2026-09-11..14).
// Rules honored here:
//  - No integration is marked enabled unless a configured key AND a live test exist.
//  - meetingRef values are legacy identifiers, never join links.
//  - Invoice totals are derived tax-inclusive; priorTotal kept only for reconciliation badges.
window.SEED = {
  generatedAt: "2026-09-15",
  brand: {
    name: "Teaching Portal",
    arabicName: "بوابة التعليم",
    tagline: "Education operations portal",
    primary: "#1d4ed8"
  },
  users: [
    { id: "USR-401", role: "admin", billingAccess: true },
    { id: "USR-402", role: "staff", billingAccess: true },
    { id: "USR-403", role: "teacher", billingAccess: false },
    { id: "USR-404", role: "student", billingAccess: false }
  ],
  courses: [
    { id: "CRS-101", title: "Academic Writing I", teacher: "Aki Sato", learnerCount: 28, term: "2026-Fall" },
    { id: "CRS-102", title: "Data Literacy", teacher: "Jun Mori", learnerCount: 31, term: "2026-Fall" },
    { id: "CRS-103", title: "Intro Biology", teacher: "Mei Tan", learnerCount: 26, term: "2026-Fall" },
    { id: "CRS-104", title: "Business Japanese", teacher: "Riku Arai", learnerCount: 19, term: "2026-Fall" },
    { id: "CRS-105", title: "Visual Design Basics", teacher: "Noa Kato", learnerCount: 24, term: "2026-Fall" },
    { id: "CRS-106", title: "Statistics Workshop", teacher: "Hana Ito", learnerCount: 22, term: "2026-Fall" }
  ],
  sessions: [
    { id: "SES-201", courseId: "CRS-101", startsAt: "2026-09-18T09:00:00+09:00", meetingRef: "meet-writing-01", shareState: "not-shared", studentVisible: false },
    { id: "SES-202", courseId: "CRS-102", startsAt: "2026-09-19T13:00:00+09:00", meetingRef: null, shareState: "shared", studentVisible: true },
    { id: "SES-203", courseId: "CRS-103", startsAt: "2026-09-22T10:00:00+09:00", meetingRef: "meet-bio-01", shareState: "missing", studentVisible: false },
    { id: "SES-204", courseId: "CRS-104", startsAt: "2026-09-23T15:30:00+09:00", meetingRef: "legacy-jp-04", shareState: "shared", studentVisible: true },
    { id: "SES-205", courseId: "CRS-105", startsAt: "2026-09-24T11:00:00+09:00", meetingRef: null, shareState: "draft", studentVisible: false },
    { id: "SES-206", courseId: "CRS-106", startsAt: "2026-09-25T16:00:00+09:00", meetingRef: "meet-stats-06", shareState: "shared", studentVisible: true }
  ],
  materials: [
    { id: "MAT-301", courseId: "CRS-101", kind: "pdf", title: "Thesis outline", version: "2026-09-10", learnerVisible: false, priorLink: "/downloads/outline-v1.pdf" },
    { id: "MAT-302", courseId: "CRS-102", kind: "video", title: "Dataset walkthrough", version: "2026-09-12", learnerVisible: true, priorLink: null },
    { id: "MAT-303", courseId: "CRS-103", kind: "pdf", title: "Cell lab safety", version: "2026-09-01", learnerVisible: true, priorLink: "/downloads/cell-safety.pdf" },
    { id: "MAT-304", courseId: "CRS-104", kind: "link", title: "Keigo practice sheet", version: "2026-08-30", learnerVisible: true, priorLink: "https://old.example.invalid/keigo" },
    { id: "MAT-305", courseId: "CRS-105", kind: "image", title: "Color exercise brief", version: "2026-09-13", learnerVisible: false, priorLink: null },
    { id: "MAT-306", courseId: "CRS-106", kind: "csv", title: "Sampling exercise data", version: "2026-09-14", learnerVisible: true, priorLink: "/downloads/sample-data.csv" }
  ],
  invoices: [
    { id: "INV-501", studentId: "USR-404", amountExTax: 12000, taxRate: 0.1, priorTotal: 12000, status: "issued", receiptRef: null },
    { id: "INV-502", studentId: "USR-405", amountExTax: 8000, taxRate: 0.1, priorTotal: 8800, status: "draft", receiptRef: "RCPT-02" },
    { id: "INV-503", studentId: "USR-406", amountExTax: 15000, taxRate: 0.1, priorTotal: 16500, status: "paid", receiptRef: null },
    { id: "INV-504", studentId: "USR-407", amountExTax: 5000, taxRate: 0.1, priorTotal: 5000, status: "manual-entry", receiptRef: "RCPT-04" },
    { id: "INV-505", studentId: "USR-408", amountExTax: 22000, taxRate: 0.1, priorTotal: 24200, status: "overdue", receiptRef: null },
    { id: "INV-506", studentId: "USR-409", amountExTax: 7000, taxRate: 0.1, priorTotal: 7700, status: "manual-entry", receiptRef: null }
  ],
  // Materials whose priorLink is known-stale or invalid per docs/integration-and-release-evidence.md
  // (MAT-301 returned a stale v1 download; MAT-304 points at an invalid legacy domain).
  staleLinks: ["MAT-301", "MAT-304"],
  integrations: {
    meetings: {
      key: "MEETING_PROVIDER_TOKEN",
      configured: false,
      liveTest: false,
      note: "المفتاح غير موجود في مخزون التسليم؛ حقول meetingRef الحالية معرّفات قديمة ولا تُستخدم لإنشاء اجتماع أو الانضمام إليه."
    },
    notifications: {
      key: "NOTIFICATION_PROVIDER_KEY",
      configured: false,
      liveTest: false,
      note: "المفتاح غير موجود؛ البديل المعتمد هو المشاركة داخل البوابة أو المشاركة اليدوية."
    },
    storage: {
      key: "STORAGE_UPLOAD_BUCKET",
      configured: false,
      liveTest: false,
      status: "unknown",
      note: "الحالة غير معروفة؛ مراجع الإيصالات السابقة لا تثبت وجود مسار رفع صالح. رفع الملفات معطّل حتى يُتحقق."
    }
  }
};
