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
  onOpenGateway?: () => void;
  onOpenVoucher?: (voucherType: string) => void;
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
  onOpenGateway,
  onOpenVoucher,
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
  const [localStockItems, setLocalStockItems] = useState<any[]>(stockItems || []);
  const [localLedgers, setLocalLedgers] = useState<any[]>(ledgers || []);
  const [localVouchers, setLocalVouchers] = useState<any[]>(vouchers || []);

  useEffect(() => {
    if (stockItems && stockItems.length > 0) setLocalStockItems(stockItems);
  }, [stockItems]);
  useEffect(() => {
    if (ledgers && ledgers.length > 0) setLocalLedgers(ledgers);
  }, [ledgers]);
  useEffect(() => {
    if (vouchers && vouchers.length > 0) setLocalVouchers(vouchers);
  }, [vouchers]);

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
      let loaded = false;
      try {
        const local = localStorage.getItem(`ledgerx_pos_purchase_list_${companyCode}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            if (!isCancelled) setPosPurchaseList(parsed);
            if (parsed.length > 0) loaded = true;
          }
        }
      } catch (_) { }

      // Check company folder service
      try {
        const folder = await companyDataFolderService.loadCompanyFolder(companyCode);
        if (!isCancelled && folder) {
          setPosPurchaseList(Array.isArray(folder.posPurchaseList) ? folder.posPurchaseList : []);
          setLocalStockItems(Array.isArray(folder.stockItems) ? folder.stockItems : []);
          setLocalLedgers(Array.isArray(folder.ledgers) ? folder.ledgers : []);
          setLocalVouchers(Array.isArray(folder.vouchers) ? folder.vouchers : []);
        } else if (!isCancelled) {
          setPosPurchaseList([]);
          setLocalStockItems([]);
          setLocalLedgers([]);
          setLocalVouchers([]);
        }
      } catch (_) { }
    };

    loadList();
    return () => { isCancelled = true; };
  }, [companyCode, isTrainingMode, trainingPkg]);

  const handleLoginSuccess = async (user: any, targetCompany?: any) => {
    const finalCo = targetCompany || activeCompanyState || company;
    setActiveCompanyState(finalCo);
    setCashierUser(user);
    permissionGuard.setCurrentUser(user);

    if (user?.isTrainingMode) {
      setIsTrainingMode(true);
      const pkg = await posTrainingService.getTrainingData();
      setTrainingPkg(pkg);
      setWorkflowState('SALES');
      return;
    }

    setIsTrainingMode(false);
    setTrainingPkg(null);

    const code = companyDataFolderService.getCompanyFolderCode(finalCo, availableCompanies);
    let diskFolder: any = null;
    try {
      diskFolder = await companyDataFolderService.loadCompanyFolder(code);
      if (diskFolder) {
        const diskStock = Array.isArray(diskFolder.stockItems) ? diskFolder.stockItems : [];
        const diskPurchaseList = Array.isArray(diskFolder.posPurchaseList) ? diskFolder.posPurchaseList : [];
        const diskLedgers = Array.isArray(diskFolder.ledgers) ? diskFolder.ledgers : [];
        const diskVouchers = Array.isArray(diskFolder.vouchers) ? diskFolder.vouchers : [];

        setLocalStockItems(diskStock);
        setPosPurchaseList(diskPurchaseList);
        setLocalLedgers(diskLedgers);
        setLocalVouchers(diskVouchers);

        onStockUpdated?.(diskStock);
        onVouchersUpdated?.(diskVouchers);
      }
    } catch (_) { }

    const diskCo = (diskFolder && diskFolder.company) ? { ...diskFolder.company, companyCode: code, code } : finalCo;
    if (onSwitchCompany) {
      await onSwitchCompany(diskCo);
    }

    // Smart role-based routing:
    const perms = user?.permissions;
    const isAdmin = Boolean(user?.isAdmin);
    const canPOS = isAdmin || Boolean(perms?.vouchers?.['POS Sale']);
    const canPurchasePOSList = isAdmin || Boolean(perms?.vouchers?.['Purchase POS List']) || Boolean(perms?.vouchers?.Purchase);
    const canPurchase = isAdmin || Boolean(perms?.vouchers?.Purchase);
    const canSales = isAdmin || Boolean(perms?.vouchers?.Sales);
    const canPayment = isAdmin || Boolean(perms?.vouchers?.Payment);
    const canReceipt = isAdmin || Boolean(perms?.vouchers?.Receipt);
    const canContra = isAdmin || Boolean(perms?.vouchers?.Contra);
    const canJournal = isAdmin || Boolean(perms?.vouchers?.Journal);

    const generalAccountingCount = [canPurchase, canSales, canPayment, canReceipt, canContra, canJournal].filter(Boolean).length;
    const hasRegisters = Boolean(perms?.registers && Object.values(perms.registers).some(Boolean));
    const hasReports = Boolean(perms?.reports && Object.values(perms.reports).some(Boolean));
    const hasMasters = Boolean(perms?.masters && Object.values(perms.masters).some(Boolean));

    // Multi-feature accounting operator / Manager / Admin (e.g. amir001):
    const hasBroadAccounting = isAdmin || (generalAccountingCount >= 2 && (hasRegisters || hasReports || hasMasters)) || (canPOS && generalAccountingCount >= 1 && (hasRegisters || hasReports));

    if (hasBroadAccounting) {
      if (onOpenGateway) {
        onOpenGateway();
        return;
      }
      onBack();
      return;
    }

    if (!canPOS) {
      // Dedicated single-function non-POS operators:
      if (canPurchase) {
        onOpenVoucher ? onOpenVoucher('Purchase') : onBack();
        return;
      }
      if (canSales) {
        onOpenVoucher ? onOpenVoucher('Sales') : onBack();
        return;
      }
      if (canPayment) {
        onOpenVoucher ? onOpenVoucher('Payment') : onBack();
        return;
      }
      if (canReceipt) {
        onOpenVoucher ? onOpenVoucher('Receipt') : onBack();
        return;
      }
      if (canContra) {
        onOpenVoucher ? onOpenVoucher('Contra') : onBack();
        return;
      }
      if (canPurchasePOSList) {
        setWorkflowState('PURCHASE_POS_LIST');
        return;
      }
      if (onOpenGateway) {
        onOpenGateway();
        return;
      }
      onBack();
      return;
    }

    // Dedicated pure POS Cashier:
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
      setWorkflowState('PURCHASE_POS_LIST');
      return;
    }

    const perms = (cashierUser as any)?.permissions || permissionGuard.getCurrentUser()?.permissions;
    const isAllowed = Boolean(
      cashierUser?.isAdmin ||
      permissionGuard.getCurrentUser()?.isAdmin ||
      perms?.vouchers?.['Purchase POS List'] ||
      perms?.vouchers?.Purchase ||
      permissionGuard.canAccessVoucher('Purchase POS List') ||
      permissionGuard.canAccessScreen('PURCHASE_POS_LIST')
    );

    if (isAllowed) {
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
        stockItems={isTrainingMode ? (trainingPkg?.stockItems || []) : (localStockItems && localStockItems.length > 0 ? localStockItems : stockItems)}
        vouchers={isTrainingMode ? (trainingPkg?.vouchers || []) : (localVouchers && localVouchers.length > 0 ? localVouchers : vouchers)}
        onBack={() => setWorkflowState('SALES')}
        onStockUpdated={(updated) => {
          if (isTrainingMode && trainingPkg) {
            const newPkg = { ...trainingPkg, stockItems: updated };
            setTrainingPkg(newPkg);
            posTrainingService.persistToDisk(newPkg);
          } else {
            setLocalStockItems(updated);
            if (onStockUpdated) onStockUpdated(updated);
          }
        }}
      />
    );
  }

  return (
    <POSSaleView
      company={isTrainingMode ? (trainingPkg?.company || TRAINING_COMPANY) : (activeCompanyState || company)}
      availableCompanies={isTrainingMode ? [] : availableCompanies}
      stockItems={isTrainingMode ? (trainingPkg?.stockItems || []) : (localStockItems && localStockItems.length > 0 ? localStockItems : stockItems)}
      posPurchaseList={posPurchaseList}
      ledgers={isTrainingMode ? (trainingPkg?.ledgers || []) : (localLedgers && localLedgers.length > 0 ? localLedgers : ledgers)}
      vouchers={isTrainingMode ? (trainingPkg?.vouchers || []) : (localVouchers && localVouchers.length > 0 ? localVouchers : vouchers)}
      cashierUser={cashierUser || undefined}
      onBack={handleExit}
      onLogoutToLogin={handleLogoutToLogin}
      onStockUpdated={(updated) => {
        if (isTrainingMode && trainingPkg) {
          const newPkg = { ...trainingPkg, stockItems: updated };
          setTrainingPkg(newPkg);
          posTrainingService.persistToDisk(newPkg);
        } else {
          setLocalStockItems(updated);
          if (onStockUpdated) onStockUpdated(updated);
        }
      }}
      onVouchersUpdated={(updated) => {
        if (isTrainingMode && trainingPkg) {
          const newPkg = { ...trainingPkg, vouchers: updated };
          setTrainingPkg(newPkg);
          posTrainingService.persistToDisk(newPkg);
        } else {
          setLocalVouchers(updated);
          if (onVouchersUpdated) onVouchersUpdated(updated);
        }
      }}
      onOpenPurchasePOSList={handleOpenPOSList}
    />
  );
}
