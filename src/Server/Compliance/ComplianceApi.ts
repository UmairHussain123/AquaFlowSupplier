import dayjs from '../../helper/dateHelper';

/**
 * SC2 (Compliance centre).
 *
 * The Aquago Supplier API exposes no document endpoints yet — uploading,
 * listing and expiring evidence is admin-side, exactly as in the supplier web
 * portal, where this module is `lib/dummy-data.ts`. Everything below is
 * therefore local placeholder data with the shapes the API is expected to
 * return, so wiring it up later is a one-file change.
 */

export type ComplianceStatus = 'verified' | 'expiring' | 'expired' | 'missing';

export interface ComplianceDocument {
  id: string;
  name: string;
  status: ComplianceStatus;
  /** ISO date the evidence stays valid through, null when it never expires. */
  valid_till: string | null;
  detail: string;
}

export interface ComplianceHistoryEntry {
  date: string;
  action: string;
}

export interface ComplianceSummary {
  documents: ComplianceDocument[];
  history: ComplianceHistoryEntry[];
  /** The single line customers see on the public shop page. */
  customerVisible: string;
  /** Null when nothing is close to expiring. */
  banner: {message: string; helper: string} | null;
}

const DOCUMENTS: ComplianceDocument[] = [
  {
    id: 'lab_test',
    name: 'Lab water test',
    status: 'expiring',
    valid_till: dayjs().add(18, 'day').toISOString(),
    detail: 'Not later than 6 months old',
  },
  {
    id: 'business_licence',
    name: 'Food / business licence',
    status: 'verified',
    valid_till: dayjs().add(7, 'month').toISOString(),
    detail: 'Plant / shop trade licence',
  },
  {
    id: 'owner_cnic',
    name: 'Owner CNIC',
    status: 'verified',
    valid_till: null,
    detail: 'Front & back, matched to the owner name',
  },
  {
    id: 'shop_photos',
    name: 'Shop & plant photos',
    status: 'verified',
    valid_till: null,
    detail: 'Signboard, inside, filling area · min 3',
  },
];

export const daysUntil = (iso: string | null): number | null => {
  if (!iso) return null;
  return dayjs(iso).startOf('day').diff(dayjs().startOf('day'), 'day');
};

export const getComplianceSummary = async (): Promise<ComplianceSummary> => {
  const soonest = DOCUMENTS.filter(doc => doc.valid_till)
    .map(doc => ({doc, days: daysUntil(doc.valid_till) ?? Infinity}))
    .sort((a, b) => a.days - b.days)[0];

  const banner =
    soonest && soonest.days <= 30
      ? {
          message: `${soonest.doc.name} expires in ${soonest.days} days`,
          helper: 'Upload the new report to stay listed to customers.',
        }
      : null;

  return {
    documents: DOCUMENTS,
    history: [
      {date: dayjs().subtract(2, 'month').format('D MMM'), action: 'lab report v2 approved'},
      {date: dayjs().subtract(6, 'month').format('D MMM'), action: 'licence renewed — approved'},
      {date: dayjs().subtract(8, 'month').format('D MMM'), action: 'lab report v1 expired'},
    ],
    customerVisible:
      '✓ Quality verified · lab test on file · licence valid',
    banner,
  };
};

export const complianceStatusLabel = (status: ComplianceStatus): string => {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'expiring':
      return 'Expiring soon';
    case 'expired':
      return 'Expired';
    default:
      return 'Not uploaded';
  }
};
