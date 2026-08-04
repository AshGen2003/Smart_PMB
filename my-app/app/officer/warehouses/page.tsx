// `/officer/warehouses` — identical implementation to `/warehouses`
// (requires manage_warehouses; renders correctly under whichever shell
// mounts it, since the page itself has no shell-specific assumptions).
export { default } from "@/app/(admin)/warehouses/page";
