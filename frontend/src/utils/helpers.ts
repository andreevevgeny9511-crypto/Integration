// ============================================================
// General utility helpers
// ============================================================

import { type EntityType, type ListokEntityType, type SyncDirection } from "@/types";

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function getEntityLabel(entityType: EntityType | ListokEntityType): string {
  const labels: Record<string, string> = {
    lead: "Lead",
    deal: "Deal",
    contact: "Contact",
    company: "Company",
    group: "Group",
    pass: "Pass",
    payment: "Payment",
  };
  return labels[entityType] || entityType;
}

export function getDirectionLabel(direction: SyncDirection): string {
  const labels: Record<SyncDirection, string> = {
    bitrix24_to_listok: "Bitrix24 → Listok",
    listok_to_bitrix24: "Listok → Bitrix24",
    bidirectional: "Bidirectional",
  };
  return labels[direction];
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}
