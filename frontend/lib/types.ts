// Shared TypeScript types for the Smart PMB Logistics Module frontend.

export interface Vehicle {
  vehicle_id: number;
  registration_no: string;
  vehicle_type: string;
  capacity: number;
  status: string;
}

export interface Driver {
  driver_id: number;
  name: string;
  license_no: string;
  contact_no: string;
  address: string;
  status: string;
}

export interface Route {
  route_id: number;
  origin: string;
  destination: string;
  distance: number;
  estimated_time: string;
}

export interface Delivery {
  delivery_id: number;
  vehicle: number;
  driver: number;
  route: number;
  purchase?: number | null;
  warehouse?: number | null;
  approved_by?: number | null;
  scheduled_date?: string | null;
  delivery_status: string;
  // read-only nested helpers returned by the API
  vehicle_registration?: string;
  driver_name?: string;
  route_label?: string;
  warehouse_name?: string;
  purchase_number?: string;
  approved_by_name?: string;
}

export interface FuelRecord {
  fuel_id: number;
  vehicle: number;
  fuel_type: string;
  quantity: number;
  cost: number;
  fuel_date?: string | null;
  vehicle_registration?: string;
}

export interface MaintenanceRecord {
  maintenance_id: number;
  vehicle: number;
  service_date?: string | null;
  description: string;
  cost: number;
  next_service_date?: string | null;
  vehicle_registration?: string;
}

export interface GpsTracking {
  tracking_id: number;
  delivery: number;
  latitude: number;
  longitude: number;
  timestamp?: string | null;
}

export interface StatusCount {
  [key: string]: string | number;
  count: number;
}

export interface Dashboard {
  counts: {
    vehicles: number;
    active_vehicles: number;
    drivers: number;
    available_drivers: number;
    routes: number;
    deliveries: number;
    in_transit: number;
    scheduled: number;
    delivered: number;
    fuel_records: number;
    maintenance_records: number;
    gps_points: number;
  };
  deliveries_by_status: { delivery_status: string; count: number }[];
  vehicle_status: { status: string; count: number }[];
  driver_status: { status: string; count: number }[];
  cost_summary: { fuel_cost_total: number; maintenance_cost_total: number };
  recent_deliveries: Delivery[];
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
}
