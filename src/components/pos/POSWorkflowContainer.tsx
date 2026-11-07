"use client";
import React, { useState, useEffect } from 'react';
import POSLoginScreen from './POSLoginScreen';
import POSSaleView from './POSSaleView';
import PurchasePOSListView from './PurchasePOSListView';
import { companyDataFolderService } from '@/lib/companyDataFolderService';
import { permissionGuard } from '@/lib/permissionGuard';
import { posTrainingService, TrainingDataPackage, TRAINING_COMPANY } from '@/lib/pos/posTrainingService';

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
  onSwitchCompany?: (targetCompany: any) => void;
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
  onSwitchCompany,
}: POSWorkflowContainerProps) {
  const [activeCompanyState, setActiveCompanyState] = useState<any>(company);

  useEffect(() => {
    setActiveCompanyState(company);
  }, [company]);

  const companyCode = activeCompanyState
    ? companyDataFolderService.getCompanyFolderCode(activeCompanyState, availableCompanies)
    : (company ? companyDataFolderService.getCompanyFolderCode(company, availableCompanies) : '10000');

  const [workflowState, setWorkflowState] = useState<'LOGIN' | 'SALES' | 'PURCHASE_POS_LIST'>('LOGIN');
  const [cashierUser, setCashierUser] = useState<any | null>(null);
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [trainingPkg, setTrainingPkg] = useState<TrainingDataPackage | null>(null);
  const [posPurchaseList, setPosPurchaseList] = useState<any[]>([]);

  useEffect(() => {
    let isCancelled = false;
    const loadList = async () => {
      if (isTrainingMode) {
        if (trainingPkg?.posPurchaseList) {
          setPosPurchaseList(trainingPkg.posPurchaseList);
        } else {
          const pkg = await posTrainingService.getTrainingData();
          if (!isCancelled && pkg?.posPurchaseList) setPosPurchaseList(pkg.posPurchaseList);
        }
        return;
      }

      // Live mode: check localStorage first
      try {
        const local = localStorage.getItem(`ledgerx_pos_purchase_list_${companyCode}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (!isCancelled) setPosPurchaseList(parsed);
          }
        }
      } catch (_) {}

      // Check company folder service
      try {
        const folder = await companyDataFolderService.loadCompanyFolder(companyCode);
        if (folder?.posPurchaseList && Array.isArray(folder.posPurchaseList) && folder.posPurchaseList.length > 0) {
          if (!isCancelled) setPosPurchaseList(folder.posPurchaseList);
        }
      } catch (_) {}
    };

    loadList();
    return () => { isCancelled = true; };
  }, [companyCode, isTrainingMode, trainingPkg]);

  const handleLoginSuccess = async (user: any, targetCompany?: any) => {
    const finalCo = targetCompany || activeCompanyState || company;
    setActiveCompanyState(finalCo);
    setCashierUser(user);

    if (user?.isTrainingMode) {
      setIsTrainingMode(true);
      const pkg = await posTrainingService.getTrainingData();
      setTrainingPkg(pkg);
    } else {
      setIsTrainingMode(false);
      setTrainingPkg(null);

      if (targetCompany && targetCompany.id !== company?.id) {
        onSwitchCompany?.(targetCompany);
      }

      // Immediately load target company's POS purchase list
      const code = companyDataFolderService.getCompanyFolderCode(finalCo, availableCompanies);
      try {
        const local = localStorage.getItem(`ledgerx_pos_purchase_list_${code}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) setPosPurchaseList(parsed);
        }
        const folder = await companyDataFolderService.loadCompanyFolder(code);
        if (folder?.posPurchaseList && Array.isArray(folder.posPurchaseList) && folder.posPurchaseList.length > 0) {
          setPosPurchaseList(folder.posPurchaseList);
        }
      } catch (_) {}
    }
    setWorkflowState('SALES');
  };

  const handleExit = () => {
    if (!permissionGuard.isClientSession()) {
      permissionGuard.setCurrentUser(null);
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem('ledgerx_active_lan_user'); } catch (_) { }
      }
    }
    setIsTrainingMode(false);
    setTrainingPkg(null);
    onBack();
  };

  const handleLogoutToLogin = () => {
    if (!permissionGuard.isClientSession()) {
      permissionGuard.setCurrentUser(null);
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem('ledgerx_active_lan_user'); } catch (_) { }
      }
    }
    setCashierUser(null);
    setIsTrainingMode(false);
    setTrainingPkg(null);
    setWorkflowState('LOGIN');
  };

  const handleOpenPOSList = () => {
    if (isTrainingMode) {
      // In training mode, cashier is always allowed to practice and inspect training POS list
      setWorkflowState('PURCHASE_POS_LIST');
      return;
    }

    if (permissionGuard.canAccessScreen('PURCHASE_POS_LIST') && permissionGuard.canAccessVoucher('Purchase POS List')) {
      // Always switch to internal PURCHASE_POS_LIST state so the cashier session is preserved
      // and pressing Escape returns smoothly step-by-step to SALES screen without logging out!
      setWorkflowState('PURCHASE_POS_LIST');
    } else {
      alert('Access Denied: You do not have permission to access Purchase POS List.');
    }
  };

  if (workflowState === 'LOGIN') {
    return (
      <POSLoginScreen
        company={activeCompanyState || company}
        companyCode={companyCode}
        availableCompanies={availableCompanies}
        onLoginSuccess={handleLoginSuccess}
        onSelectCompany={(targetCo) => {
          setActiveCompanyState(targetCo);
          onSwitchCompany?.(targetCo);
        }}
        onExit={handleExit}
      />
    );
  }

  if (workflowState === 'PURCHASE_POS_LIST') {
    return (
      <PurchasePOSListView
        company={isTrainingMode ? (trainingPkg?.company || TRAINING_COMPANY) : (activeCompanyState || company)}
        availableCompanies={isTrainingMode ? [] : availableCompanies}
        stockItems={isTrainingMode ? (trainingPkg?.stockItems || []) : stockItems}
        vouchers={isTrainingMode ? (trainingPkg?.vouchers || []) : vouchers}
        onBack={() => setWorkflowState('SALES')}
        onStockUpdated={(updated) => {
          if (isTrainingMode && trainingPkg) {
            const newPkg = { ...trainingPkg, stockItems: updated };
            setTrainingPkg(newPkg);
            posTrainingService.persistToDisk(newPkg);
          } else if (onStockUpdated) {
            onStockUpdated(updated);
          }
        }}
      />
    );
  }

  return (
    <POSSaleView
      company={isTrainingMode ? (trainingPkg?.company || TRAINING_COMPANY) : (activeCompanyState || company)}
      availableCompanies={isTrainingMode ? [] : availableCompanies}
      stockItems={isTrainingMode ? (trainingPkg?.stockItems || []) : stockItems}
      posPurchaseList={posPurchaseList}
      ledgers={isTrainingMode ? (trainingPkg?.ledgers || []) : ledgers}
      vouchers={isTrainingMode ? (trainingPkg?.vouchers || []) : vouchers}
      cashierUser={cashierUser || undefined}
      onBack={handleExit}
      onLogoutToLogin={handleLogoutToLogin}
      onStockUpdated={(updated) => {
        if (isTrainingMode && trainingPkg) {
          const newPkg = { ...trainingPkg, stockItems: updated };
          setTrainingPkg(newPkg);
          posTrainingService.persistToDisk(newPkg);
        } else if (onStockUpdated) {
          onStockUpdated(updated);
        }
      }}
      onVouchersUpdated={(updated) => {
        if (isTrainingMode && trainingPkg) {
          const newPkg = { ...trainingPkg, vouchers: updated };
          setTrainingPkg(newPkg);
          posTrainingService.persistToDisk(newPkg);
        } else if (onVouchersUpdated) {
          onVouchersUpdated(updated);
        }
      }}
      onOpenPurchasePOSList={handleOpenPOSList}
    />
  );
}
