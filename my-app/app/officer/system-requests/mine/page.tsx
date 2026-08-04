// `/officer/system-requests/mine` — identical implementation to
// `/system-requests/mine` (requires request_system_changes). Stripe's
// success_url/cancel_url (sysops/views.py's
// SystemChangeRequestViewSet.accept) point here, not the admin-shell path.
export { default } from "@/app/(admin)/system-requests/mine/page";
