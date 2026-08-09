/**
 * Server Actions for the system-change-request/token/Stripe-payment
 * workflow — see sysops/models.py's SystemChangeRequest for the full
 * pending -> payment_pending -> token_issued -> in_progress -> completed
 * (or rejected) lifecycle this drives. Shared by both the officer's own
 * request view ((admin)/system-requests/mine) and the admin's review
 * queue ((admin)/system-requests) — the backend's
 * SystemChangeRequestViewSet scopes each caller to what they're allowed
 * to see/do.
 */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch } from "@/app/lib/api";
import { firstErrorMessage } from "@/app/lib/errors";

export type SystemRequestFormState = {
  error?: string;
};

/** Officer: submits a new system-change request (title/description only — the admin sets the fee later, on accept). */
export async function createSystemChangeRequest(
  _prevState: SystemRequestFormState,
  formData: FormData
): Promise<SystemRequestFormState> {
  const res = await apiFetch("/api/system-requests/", {
    method: "POST",
    body: JSON.stringify({
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/system-requests/mine");
  revalidatePath("/officer/system-requests/mine");
  return {};
}

/** Admin: accepts a pending request by setting its fee, which creates the Stripe Checkout Session the officer will pay. */
export async function acceptSystemChangeRequest(
  requestId: number,
  feeAmount: string
): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/system-requests/${requestId}/accept/`, {
    method: "POST",
    body: JSON.stringify({ fee_amount: feeAmount }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/system-requests");
  revalidatePath("/system-requests/mine");
  revalidatePath("/officer/system-requests/mine");
  return {};
}

/** Admin: rejects a pending request outright — no payment is ever involved. */
export async function rejectSystemChangeRequest(
  requestId: number,
  reason: string
): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/system-requests/${requestId}/reject/`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/system-requests");
  revalidatePath("/system-requests/mine");
  revalidatePath("/officer/system-requests/mine");
  return {};
}

/** Admin: posts one progress-timeline entry against a token-issued/in-progress request; posting "deployed" completes it. */
export async function postProgressUpdate(
  requestId: number,
  stage: string,
  note: string
): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/system-requests/${requestId}/progress/`, {
    method: "POST",
    body: JSON.stringify({ stage, note }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/system-requests");
  revalidatePath("/system-requests/mine");
  revalidatePath("/officer/system-requests/mine");
  return {};
}

/**
 * Officer: fetches a fresh Stripe Checkout URL for a payment-pending
 * request and redirects the browser straight to Stripe's hosted checkout
 * page. Never returns on success (redirect() throws, same convention as
 * actions/auth.ts's login) — only returns when the lookup itself fails.
 */
export async function payForSystemChangeRequest(requestId: number): Promise<{ error?: string } | void> {
  const res = await apiFetch(`/api/system-requests/${requestId}/checkout-url/`);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  const { url } = await res.json();
  if (!url) {
    return { error: "Couldn't get a payment link — try again or contact an admin." };
  }
  redirect(url);
}

/**
 * Officer (their own request) or admin (any request): cancels a
 * payment-pending request whose Stripe Checkout Session has genuinely
 * expired. The backend re-checks Stripe directly and rejects this with an
 * error if the session isn't actually expired yet, so this is safe to
 * expose as a plain button — see sysops/views.py's
 * SystemChangeRequestViewSet.cancel_expired_payment.
 */
export async function cancelExpiredPayment(requestId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/system-requests/${requestId}/cancel-expired-payment/`, {
    method: "POST",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/system-requests");
  revalidatePath("/system-requests/mine");
  revalidatePath("/officer/system-requests/mine");
  return {};
}

/**
 * Deletes a request — either the requesting officer withdrawing their own,
 * or an admin clearing one out. The backend only allows this while
 * fee_amount is still unset (status PENDING or REJECTED — see
 * sysops/views.py's SystemChangeRequestViewSet.destroy), so anything with
 * a real Stripe payment/token behind it can never be deleted.
 */
export async function deleteSystemChangeRequest(requestId: number): Promise<{ error?: string }> {
  const res = await apiFetch(`/api/system-requests/${requestId}/`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: firstErrorMessage(data) };
  }

  revalidatePath("/system-requests");
  revalidatePath("/system-requests/mine");
  revalidatePath("/officer/system-requests/mine");
  return {};
}
