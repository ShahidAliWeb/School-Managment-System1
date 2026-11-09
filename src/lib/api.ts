import { UserRole } from '../types/index.ts';

let authToken: string | null = sessionStorage.getItem('gbps_kando_lund_jwt');

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    sessionStorage.setItem('gbps_kando_lund_jwt', token);
  } else {
    sessionStorage.removeItem('gbps_kando_lund_jwt');
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function formatPKR(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatRoleLabel(role: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'Super Admin';
    case UserRole.ADMIN:
      return 'Admin / Principal';
    case UserRole.TEACHER:
      return 'Teacher';
    case UserRole.ACCOUNTANT:
      return 'Accountant';
    case UserRole.STUDENT:
      return 'Student';
    case UserRole.PARENT:
      return 'Parent';
    default:
      return role;
  }
}

/**
 * Exports rows as an Excel-compatible UTF-8 CSV file download.
 */
export function exportToExcelCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
