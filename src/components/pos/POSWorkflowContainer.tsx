"use client";
import React, { useState } from 'react';
import POSLoginScreen from './POSLoginScreen';
import POSSaleView from './POSSaleView';
import { companyDataFolderService } from '@/lib/companyDataFolderService';

interface POSWorkflowContainerProps {
  company: any;
  availableCompanies?: any[];
  stockItems: any[];
  ledgers: any[];
  vouchers: any[];
  onBack: () => void;
  onStockUpdated?: (updatedStock: any[]) => void;
  onVouchersUpdated?: (updatedVouchers: any[]) => void;
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
}: POSWorkflowContainerProps) {
  const companyCode = company 
    ? companyDataFolderService.getCompanyFolderCode(company, availableCompanies) 
    : '10000';

  const [workflowState, setWorkflowState] = useState<'LOGIN' | 'SALES'>('LOGIN');
  const [cashierUser, setCashierUser] = useState<{
    id: string;
    username: string;
    fullName: string;
    isTrainingMode?: boolean;
  } | null>(null);

  const handleLoginSuccess = (user: {
    id: string;
    username: string;
    fullName: string;
    isTrainingMode: boolean;
  }) => {
    setCashierUser(user);
    setWorkflowState('SALES');
  };

  const handleLogoutToLogin = () => {
    setCashierUser(null);
    setWorkflowState('LOGIN');
  };

  if (workflowState === 'LOGIN') {
    return (
      <POSLoginScreen
        company={company}
        companyCode={companyCode}
        onLoginSuccess={handleLoginSuccess}
        onExit={onBack}
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
      onBack={onBack}
      onLogoutToLogin={handleLogoutToLogin}
      onStockUpdated={onStockUpdated}
      onVouchersUpdated={onVouchersUpdated}
    />
  );
}

