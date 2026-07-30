'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { warehouses as mockWarehouses, purchases as mockPurchases, approvals as mockApprovals, kpis as mockKpis, inventoryByWarehouse, capacityAlerts as mockAlerts } from './data';

const USE_MOCK = typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_URL;

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      if (USE_MOCK) return mockWarehouses;
      const res = await api.warehouses.list();
      return res.warehouses;
    },
    staleTime: 30_000,
  });
}

export function useWarehouseDetail(id: number) {
  return useQuery({
    queryKey: ['warehouse', id],
    queryFn: async () => {
      if (USE_MOCK) return mockWarehouses.find(w => w.warehouse_id === id)!;
      const res = await api.warehouses.detail(id);
      return res.warehouse;
    },
    enabled: !!id,
  });
}

export function useWarehouseInventory(id: number) {
  return useQuery({
    queryKey: ['warehouseInventory', id],
    queryFn: async () => {
      if (USE_MOCK) return inventoryByWarehouse[id] || [];
      const res = await api.warehouses.inventory(id);
      return res.inventory;
    },
    enabled: !!id,
  });
}

export function usePurchases(status?: string) {
  return useQuery({
    queryKey: ['purchases', status],
    queryFn: async () => {
      if (USE_MOCK) return mockPurchases;
      const res = await api.purchases.list(status);
      return res.purchases;
    },
    staleTime: 15_000,
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.purchases.create(data);
      return res.purchase;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

export function useDeliveries() {
  return useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => {
      if (USE_MOCK) return [];
      const res = await api.deliveries.list();
      return res.deliveries;
    },
  });
}

export function useApprovals() {
  return useQuery({
    queryKey: ['approvals'],
    queryFn: async () => {
      if (USE_MOCK) return mockApprovals;
      const res = await api.approvals.recent();
      return res.approvals;
    },
    staleTime: 30_000,
  });
}

export function useCapacityAlerts() {
  return useQuery({
    queryKey: ['capacityAlerts'],
    queryFn: async () => {
      if (USE_MOCK) return mockAlerts();
      const res = await api.warehouses.alerts();
      return res.alerts;
    },
    staleTime: 30_000,
  });
}

export function useDashboardKpis() {
  return useQuery({
    queryKey: ['dashboardKpis'],
    queryFn: async () => {
      if (USE_MOCK) return mockKpis();
      const res = await api.dashboard.kpis();
      return res.kpis;
    },
    staleTime: 30_000,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.auth.login(email, password),
  });
}
