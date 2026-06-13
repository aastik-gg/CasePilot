import type { ClauseType } from "@/domain/schemas/clause";

/** Golden corpus for the M1–M5 eval (PROJECT_PLAN §P0/§Eval). Hand-annotated; English; perspective = "us" (customer). */

export interface GoldenContract {
  title: string;
  text: string;
  /** Every named clause type planted in the document (M1). */
  expectedClauseTypes: ClauseType[];
  /** Intentionally problematic clauses — must be flagged high/critical (M2) and unfavourable (M4). */
  landmineTypes: ClauseType[];
}

/** One contract containing all 7 named clause types, several deliberately customer-hostile. */
export const ALL_TYPES_CONTRACT: GoldenContract = {
  title: "Master Services Agreement (Eval)",
  text: `1. Term and Termination
This Agreement begins on the Effective Date and continues for one (1) year. The Vendor may terminate this Agreement at any time, for any reason, without notice and without liability to the Customer. The Customer may terminate only for the Vendor's uncured material breach after ninety (90) days written notice.

2. Payment Terms
The Customer shall pay all invoices within fifteen (15) days. All fees are non-refundable. The Vendor may increase fees at any time in its sole discretion without notice. Late payments accrue interest at 5% per month.

3. Limitation of Liability
The Customer's aggregate liability under this Agreement shall be unlimited. The Vendor's total liability for any and all claims shall not exceed one hundred dollars ($100), regardless of the form of action.

4. Indemnification
The Customer shall indemnify, defend, and hold harmless the Vendor from any and all claims, losses, and liabilities arising out of or relating to this Agreement, including claims caused by the Vendor's own negligence. The Vendor provides no indemnification of any kind.

5. Confidentiality
Each party shall keep the other party's Confidential Information confidential and shall not disclose it to third parties, except as required by law. These obligations survive termination for three (3) years.

6. Intellectual Property
All intellectual property, work product, and deliverables created under this Agreement, including any materials authored by the Customer, shall be the sole and exclusive property of the Vendor.

7. Governing Law
This Agreement shall be governed by and construed in accordance with the laws of the Vendor's home jurisdiction, and the parties submit to the exclusive jurisdiction of its courts.`,
  expectedClauseTypes: [
    "termination",
    "payment_terms",
    "liability_limit",
    "indemnity",
    "confidentiality",
    "ip_ownership",
    "governing_law",
  ],
  // Confidentiality is roughly market; the rest are skewed against the customer.
  landmineTypes: ["liability_limit", "indemnity", "ip_ownership", "termination", "payment_terms"],
};

/** Three contracts differing only on Limitation of Liability — for the compare metric (M5). */
export const COMPARE_CONTRACTS: { title: string; text: string }[] = [
  {
    title: "Vendor A (balanced)",
    text: `1. Limitation of Liability
Each party's aggregate liability under this Agreement is capped at the total fees paid in the twelve (12) months preceding the claim, with customary uncapped carve-outs for confidentiality, indemnification, and IP infringement.`,
  },
  {
    title: "Vendor B (hostile)",
    text: `1. Limitation of Liability
The Customer's liability under this Agreement is unlimited. The Vendor's liability is capped at one hundred dollars ($100) for any and all claims.`,
  },
  {
    title: "Vendor C (high cap)",
    text: `1. Limitation of Liability
Each party's aggregate liability under this Agreement shall not exceed one million dollars ($1,000,000), with carve-outs for gross negligence and willful misconduct.`,
  },
];
