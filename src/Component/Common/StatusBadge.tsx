import React from 'react';
import Pill, {type PillTone} from './Pill';
import {statusLabel} from '../../helper/helperFunction';

/** Maps every backend status the app renders onto one of the pill tones. */
const TONE_BY_STATUS: Record<string, PillTone> = {
  // Orders
  placed: 'danger',
  accepted: 'primary',
  preparing: 'primary',
  out_for_delivery: 'primary',
  delivered: 'success',
  completed: 'success',
  rejected: 'muted',
  cancelled: 'muted',
  // Tickets
  open: 'warning',
  pending: 'primary',
  resolved: 'success',
  closed: 'muted',
  // Disputes
  investigating: 'primary',
  // Payments
  paid: 'success',
  unpaid: 'warning',
};

const StatusBadge: React.FC<{status: string; uppercase?: boolean}> = ({
  status,
  uppercase = true,
}) => (
  <Pill
    label={statusLabel(status)}
    tone={TONE_BY_STATUS[status] ?? 'muted'}
    uppercase={uppercase}
  />
);

export default StatusBadge;
