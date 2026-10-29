// ============================================================
// Form validation utilities
// ============================================================

export interface ValidationError {
  field: string;
  message: string;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value) return null; // Let required handle empty
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return "Please enter a valid email address";
  }
  return null;
}

export function validateUrl(value: string): string | null {
  if (!value) return null;
  try {
    new URL(value);
    return null;
  } catch {
    return "Please enter a valid URL";
  }
}

export function validateApiKey(value: string): string | null {
  if (!value) return null;
  if (value.length < 10) {
    return "API key must be at least 10 characters";
  }
  return null;
}

export function validateDomain(value: string): string | null {
  if (!value) return null;
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*(\.[a-zA-Z0-9-]+)+$/;
  if (!domainRegex.test(value)) {
    return "Please enter a valid domain (e.g., yourcompany.bitrix24.ru)";
  }
  return null;
}

export function validateSyncRule(rule: {
  name: string;
  sourceEntity: string;
  targetEntity: string;
  direction: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!rule.name.trim()) errors.push({ field: "name", message: "Rule name is required" });
  if (!rule.sourceEntity) errors.push({ field: "sourceEntity", message: "Source entity is required" });
  if (!rule.targetEntity) errors.push({ field: "targetEntity", message: "Target entity is required" });
  if (!rule.direction) errors.push({ field: "direction", message: "Direction is required" });
  return errors;
}
