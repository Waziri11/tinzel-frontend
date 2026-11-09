const stages = {
  awaiting_payment: 1,
  payment_verified: 1,
  queued_for_assignment: 2,
  assigned: 2,
  in_design: 2,
  draft_manager_review: 2,
  client_review: 3,
  revision_requested: 2,
  awaiting_balance_payment: 4,
  balance_payment_review: 4,
  client_approved: 4,
  print_document_prep: 4,
  print_manager_review: 4,
  printing_sent: 4,
  printing_in_progress: 4,
  printing_completed: 5,
  dispatched: 5,
  delivered: 5,
  closed: 5,
};

export function customerJourney(order) {
  const known = Object.hasOwn(stages, order.status) || order.status === 'on_hold';
  const status = known ? order.status : 'unknown';
  const progressStatus = status === 'on_hold' ? order.previousStatusBeforeHold : status;
  const updating = ['in_design', 'draft_manager_review'].includes(status)
    && order.revisionRequests?.some(request => (!request.source || request.source === 'client') && request.status !== 'resolved');
  return {
    statusKey: `track.status.${updating ? 'revision_requested' : status}`,
    detailKey: `track.detail.${updating ? 'revision_requested' : status}`,
    stage: stages[progressStatus] ?? 0,
    complete: ['delivered', 'closed'].includes(status),
  };
}

export const customerChangeStatusKey = status => `track.changes.${['open', 'submitted_for_review', 'resolved'].includes(status) ? status : 'unknown'}`;
