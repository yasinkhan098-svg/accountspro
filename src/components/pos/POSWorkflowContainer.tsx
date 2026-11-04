"use client";
import React, { useState } from 'react';
import POSLoginScreen from './POSLoginScreen';
import POSSaleView from './POSSaleView';
import { companyDataFolderService } from '@/lib/companyDataFolderService';
import { permissionGuard } from '@/lib/permissionGuard';

interface POSWorkflowContainerProps {
  company: any;
  availableCompanies?: any[];
  stockItems: any[];
  ledgers: any[];
  vouchers: any[];
  onBack: () => void;
  onStockUpdated?: (updatedStock: any[]) => void;
  onVouchersUpdated?: (updatedVouchers: any[]) => void;
  onOpenPurchasePOSList?: () => void;
}

export default function POSWorkflowContainer({
  company,
  availableCompanies = [],
  stockItems = [],
  ledgers = [],
  vouchers = [],
  onBack,
  onStockUpdated,
  onVouchersUpdated,
  onOpenPurchasePOSList,
}: POSWorkflowContainerProps) {
  const companyCode = company 
    ? companyDataFolderService.getCompanyFolderCode(company, availableCompanies) 
    : '10000';

  const [workflowState, setWorkflowState] = useState<'LOGIN' | 'SALES'>('LOGIN');
  const [cashierUser, setCashierUser] = useState<any | null>(null);

  const handleLoginSuccess = (user: any) => {
    setCashierUser(user);
    setWorkflowState('SALES');
  };

  const handleExit = () => {
    if (!permissionGuard.isClientSession()) {
      permissionGuard.setCurrentUser(null);
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem('ledgerx_active_lan_user'); } catch (_) {}
      }
    }
    onBack();
  };

  const handleLogoutToLogin = () => {
    if (!permissionGuard.isClientSession()) {
      permissionGuard.setCurrentUser(null);
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem('ledgerx_active_lan_user'); } catch (_) {}
      }
    }
    setCashierUser(null);
    setWorkflowState('LOGIN');
  };

  const handleOpenPOSList = () => {
    if (permissionGuard.canAccessScreen('PURCHASE_POS_LIST') && permissionGuard.canAccessVoucher('Purchase POS List')) {
      if (onOpenPurchasePOSList) onOpenPurchasePOSList();
    } else {
      alert('Access Denied: You do not have permission to access Purchase POS List.');
    }
  };

  if (workflowState === 'LOGIN') {
    return (
      <POSLoginScreen
        company={company}
        companyCode={companyCode}
        onLoginSuccess={handleLoginSuccess}
        onExit={handleExit}
      />
    );
  }

  return (
    <POSSaleView
      company={company}
      availableCompanies={availableCompanies}
      stockItems={stockItems}
      ledgers={ledgers}
      vouchers={vouchers}
      cashierUser={cashierUser || undefined}
      onBack={handleExit}
      onLogoutToLogin={handleLogoutToLogin}
      onStockUpdated={onStockUpdated}
      onVouchersUpdated={onVouchersUpdated}
      onOpenPurchasePOSList={handleOpenPOSList}
    />
  );
}

