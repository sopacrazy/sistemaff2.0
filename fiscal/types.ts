import React from 'react';

// Define application-wide types

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  FISCAL_AUDIT = 'FISCAL_AUDIT',
  CONSULTATION = 'CONSULTATION',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS'
}

export interface FiscalIssue {
  id: string;
  date: string; // ISO format YYYY-MM-DD
  customer: string;
  value: number;
  description: string;
  status: string; // e.g., "Pendente", "Sem Nota", "Erro Emissão"
}

export interface FiscalStats {
  missingInMonth: number;
  missingInYear: number;
  totalAnalyzed: number;
}

export interface FiscalAuditResult {
  stats: FiscalStats;
  issues: FiscalIssue[];
  periodAnalysis: string; // AI commentary on the period
}

export interface SidebarItem {
  id: ViewState;
  label: string;
  icon: React.ReactNode;
}