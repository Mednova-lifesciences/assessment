export type QuestionId =
  | 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8' | 'q9' | 'q10';

export interface Question {
  id: QuestionId;
  text: string;
  critical: boolean;
  advice: string;
}

export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'Do you have a permanently resident, qualified QPPV physically located in Nigeria?',
    critical: true,
    advice: 'NAFDAC requires a permanently resident, qualified QPPV in-country. Outsourcing this to MedNova ensures immediate, continuous compliance.'
  },
  {
    id: 'q2',
    text: 'Do you have a formally designated deputy/backup QPPV in Nigeria to ensure continuous coverage?',
    critical: true,
    advice: 'Continuous PV coverage is legally mandated. You must have backup provisions in place for when your primary QPPV is unavailable.'
  },
  {
    id: 'q3',
    text: 'Is there a named Local Safety Officer (LSO) or Local Contact Person for PV registered with NAFDAC?',
    critical: false,
    advice: 'Having an explicit, registered in-country point of contact streamlines regulatory queries and prevents administrative delays.'
  },
  {
    id: 'q4',
    text: 'Is your Pharmacovigilance System Master File (PSMF) fully localized and regularly updated for Nigerian operations?',
    critical: true,
    advice: 'A global PSMF is not enough. NAFDAC expects local annexes or a localized PSMF detailing Nigerian safety infrastructure.'
  },
  {
    id: 'q5',
    text: 'Do you have an active, validated pathway for capturing and processing local Adverse Drug Reactions (ADRs)?',
    critical: true,
    advice: "You must be able to ingest, process, and report local spontaneous ADR cases (ICSRs) within NAFDAC's strict timelines."
  },
  {
    id: 'q6',
    text: 'Do you conduct weekly literature monitoring across local Nigerian medical journals and news sources?',
    critical: false,
    advice: 'Global literature databases often miss regional Nigerian publications. MedNova offers automated local screening to solve this exact bottleneck.'
  },
  {
    id: 'q7',
    text: 'Are you actively tracking and submitting PSURs/PBRERs in alignment with NAFDAC regulatory cycles?',
    critical: false,
    advice: 'Periodic safety reports must be synchronized with NAFDAC schedules. MedNova manages the entire authoring and submission cycle.'
  },
  {
    id: 'q8',
    text: 'Have you submitted product-specific Risk Management Plans (RMP) or educational materials to NAFDAC?',
    critical: false,
    advice: 'Products with specific risk profiles require customized RMPs and localized risk minimization measures (aRMMs).'
  },
  {
    id: 'q9',
    text: 'Do you have a formalized process for safety signal detection and escalation of safety concerns in Nigeria?',
    critical: true,
    advice: 'NAFDAC expects proactive safety screening, not just passive reporting. Signal management is a core QPPV requirement.'
  },
  {
    id: 'q10',
    text: 'Are your local PV SOPs and training records audit-ready for a surprise NAFDAC inspection?',
    critical: true,
    advice: 'Inspection readiness is key. MedNova conducts gap analyses and pre-audit dry runs to protect your marketing authorization.'
  }
];
