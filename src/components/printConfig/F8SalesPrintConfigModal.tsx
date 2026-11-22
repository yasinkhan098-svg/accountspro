"use client";
import React, { useState, useEffect } from 'react';
import { F8SalesPrintConfig, PrintFieldConfig } from '@/lib/printConfig/printConfigTypes';
import { printConfigService, getDefaultF8SalesConfig } from '@/lib/printConfig/printConfigService';
import { companyDataFolderService } from '@/lib/companyDataFolderService';

interface F8SalesPrintConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCompany: any;
  availableCompanies?: any[];
  onSaved?: (savedF8Config: F8SalesPrintConfig) => void;
}

export default function F8SalesPrintConfigModal({
  isOpen,
  onClose,
  activeCompany,
  availableCompanies = [],
  onSaved,
}: F8SalesPrintConfigModalProps) {
  const companyCode = companyDataFolderService.getCompanyFolderCode(activeCompany, availableCompanies);
  const companyName = activeCompany?.name || 'Company Name';
  const country = activeCompany?.country || 'India';
  const isIndia = country.toLowerCase().trim() === 'india';
  const currencySymbol = activeCompany?.currencySymbol || activeCompany?.baseCurrencySymbol || activeCompany?.currency || (isIndia ? '₹' : 'AED');

  const [f8Config, setF8Config] = useState<F8SalesPrintConfig>(() => {
    const parentConfig = printConfigService.loadPrintConfig(companyCode, activeCompany);
    return parentConfig.f8SalesConfig || getDefaultF8SalesConfig(activeCompany);
  });

  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const parentConfig = printConfigService.loadPrintConfig(companyCode, activeCompany);
      setF8Config(parentConfig.f8SalesConfig || getDefaultF8SalesConfig(activeCompany));
    }
  }, [isOpen, companyCode, activeCompany]);

  // Keyboard shortcut listener: Ctrl+A to save, Escape to exit
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, f8Config]);

  if (!isOpen) return null;

  const updateField = (
    fieldKey: keyof Omit<F8SalesPrintConfig, 'customFields' | 'customInvoiceSeries'>,
    updates: Partial<PrintFieldConfig>
  ) => {
    setF8Config(prev => ({
      ...prev,
      [fieldKey]: {
        ...((prev[fieldKey] as PrintFieldConfig) || { label: '', value: '', enabled: true }),
        ...updates,
      },
    }));
  };

  const updateCustomSeries = (updates: Partial<{ enabled: boolean; prefix: string; startingNumber: number; padDigits: number }>) => {
    setF8Config(prev => ({
      ...prev,
      customInvoiceSeries: {
        enabled: prev.customInvoiceSeries?.enabled || false,
        prefix: prev.customInvoiceSeries?.prefix !== undefined ? prev.customInvoiceSeries.prefix : '',
        startingNumber: prev.customInvoiceSeries?.startingNumber || 1,
        padDigits: prev.customInvoiceSeries?.padDigits || 4,
        ...updates,
      },
    }));
  };

  const handleResetDefaults = () => {
    if (confirm(`Reset all F8 Sales print fields to default recommendations for ${country}?`)) {
      setF8Config(getDefaultF8SalesConfig(activeCompany));
    }
  };

  const handleSave = async () => {
    const parentConfig = printConfigService.loadPrintConfig(companyCode, activeCompany);
    const updatedParent = {
      ...parentConfig,
      f8SalesConfig: f8Config,
      updatedAt: new Date().toISOString(),
    };

    await printConfigService.savePrintConfig(companyCode, updatedParent, activeCompany);
    if (onSaved) onSaved(f8Config);
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 600);
  };

  const renderFieldRow = (
    fieldKey: keyof Omit<F8SalesPrintConfig, 'customFields' | 'customInvoiceSeries'>,
    title: string,
    placeholder: string,
    options?: { showInput?: boolean; help?: string }
  ) => {
    const field = (f8Config[fieldKey] as PrintFieldConfig) || { label: title, value: '', enabled: true };
    const showInput = options?.showInput !== false;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 10px',
          background: field.enabled ? '#ffffff' : '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          marginBottom: 8,
          transition: 'all 0.15s ease',
        }}
      >
        {/* Toggle switch */}
        <label
          style={{
            position: 'relative',
            display: 'inline-block',
            width: 40,
            height: 22,
            flexShrink: 0,
            cursor: 'pointer',
          }}
          title={field.enabled ? 'Click to Disable from Invoice' : 'Click to Enable on Invoice'}
        >
          <input
            type="checkbox"
            checked={!!field.enabled}
            onChange={e => updateField(fieldKey, { enabled: e.target.checked })}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: field.enabled ? '#059669' : '#cbd5e1',
              borderRadius: 22,
              transition: '0.2s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                content: '""',
                height: 16,
                width: 16,
                left: field.enabled ? 21 : 3,
                bottom: 3,
                background: 'white',
                borderRadius: '50%',
                transition: '0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </span>
        </label>

        {/* Label & Help */}
        <div style={{ flex: '0 0 190px' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: field.enabled ? '#0f172a' : '#94a3b8' }}>
            {title}
          </div>
          {options?.help && (
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{options.help}</div>
          )}
        </div>

        {/* Value Input */}
        {showInput ? (
          <div style={{ flex: 1 }}>
            <input
              type="text"
              disabled={!field.enabled}
              value={field.value || ''}
              placeholder={placeholder}
              onChange={e => updateField(fieldKey, { value: e.target.value })}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: 12,
                fontFamily: 'monospace',
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                background: field.enabled ? '#ffffff' : '#f1f5f9',
                color: field.enabled ? '#0f172a' : '#94a3b8',
                outline: 'none',
              }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, fontSize: 12, color: field.enabled ? '#059669' : '#94a3b8', fontWeight: 500 }}>
            {field.enabled ? '✓ Enabled for Printing' : '✕ Hidden from Printing'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '95vw',
          maxWidth: 1200,
          height: '92vh',
          maxHeight: 880,
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '2px solid #1a365d',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            background: 'linear-gradient(90deg, #1a365d 0%, #2b6cb0 100%)',
            color: '#ffffff',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>📑</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.5 }}>
                F8 Sales Invoice Print Configuration — {companyName}
              </div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>
                Country: <b>{country}</b> ({isIndia ? 'Traditional India GST Format' : 'Modern International Format (Image One)'})
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.18)', padding: '4px 8px', borderRadius: 4 }}>
              Auto-fills missing company details on F8 Sales preview
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: 22,
                cursor: 'pointer',
                lineHeight: 1,
                padding: '0 6px',
              }}
              title="Close (Esc)"
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', overflow: 'hidden' }}>
          {/* Left Form Column */}
          <div style={{ padding: '16px 20px', overflowY: 'auto', background: '#f8fafc', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 6, padding: '10px 12px', marginBottom: 14, fontSize: 11, color: '#0369a1', lineHeight: 1.4 }}>
              💡 <b>Data Priority:</b> Company creation me dali gayi details (Name, Address, TRN, Bank) pehle print hoti hain. Agar koi detail company creation me na ho (jaise Trade License, IBAN, Swift, Salesperson, Payment Terms), to is form me bhari hui value print hogi. Har field ko <b>Yes/No switch</b> se hide/show kar sakte hain.
            </div>

            {/* 0. F8 Sales Custom Invoice Numbering Series */}
            <div style={{ background: '#ffffff', border: '2px solid #2563eb', borderRadius: 8, padding: 14, marginBottom: 16, boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🔢</span> F8 Sales Custom Invoice Series
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: f8Config.customInvoiceSeries?.enabled ? '#059669' : '#64748b' }}>
                  <input
                    type="checkbox"
                    checked={!!f8Config.customInvoiceSeries?.enabled}
                    onChange={e => updateCustomSeries({ enabled: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: '#2563eb', cursor: 'pointer' }}
                  />
                  <span>{f8Config.customInvoiceSeries?.enabled ? '✓ Custom Series Active' : 'Off (Default Numbering)'}</span>
                </label>
              </div>

              <div style={{ fontSize: 11, color: '#475569', marginBottom: 10, lineHeight: 1.4 }}>
                F8 Sales voucher ke liye apni manpasand prefix and starting number set karein (jaise <b>INV/26/0001</b> ya <b>HPL-26-0001</b>). Voucher save hone par number automatically 1, 2, 3... increase hoga aur Sales Register me save hoga.
              </div>

              {f8Config.customInvoiceSeries?.enabled && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 3 }}>
                        Invoice Prefix
                      </label>
                      <input
                        type="text"
                        value={f8Config.customInvoiceSeries?.prefix !== undefined ? f8Config.customInvoiceSeries.prefix : ''}
                        onChange={e => updateCustomSeries({ prefix: e.target.value })}
                        placeholder="e.g. INV/26/ or HPL-26-"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: 12,
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          border: '1px solid #94a3b8',
                          borderRadius: 4,
                          background: '#ffffff',
                          color: '#0f172a',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 3 }}>
                        Starting No.
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={f8Config.customInvoiceSeries?.startingNumber || 1}
                        onChange={e => updateCustomSeries({ startingNumber: Math.max(1, parseInt(e.target.value) || 1) })}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: 12,
                          fontWeight: 'bold',
                          border: '1px solid #94a3b8',
                          borderRadius: 4,
                          background: '#ffffff',
                          color: '#0f172a',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 3 }}>
                        Digits Padding
                      </label>
                      <select
                        value={f8Config.customInvoiceSeries?.padDigits || 4}
                        onChange={e => updateCustomSeries({ padDigits: parseInt(e.target.value) || 4 })}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: 12,
                          fontWeight: 'bold',
                          border: '1px solid #94a3b8',
                          borderRadius: 4,
                          background: '#ffffff',
                          color: '#0f172a',
                          outline: 'none',
                        }}
                      >
                        <option value={1}>1 (e.g. 1, 2, 3)</option>
                        <option value={2}>2 (e.g. 01, 02)</option>
                        <option value={3}>3 (e.g. 001, 002)</option>
                        <option value={4}>4 (e.g. 0001, 0002)</option>
                        <option value={5}>5 (e.g. 00001)</option>
                        <option value={6}>6 (e.g. 000001)</option>
                      </select>
                    </div>
                  </div>

                  {/* Live Series Preview Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eff6ff', padding: '6px 10px', borderRadius: 4, border: '1px dashed #3b82f6' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1e40af' }}>Preview Next Invoices:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb', fontSize: 12 }}>
                      {(f8Config.customInvoiceSeries?.prefix || '') + String(f8Config.customInvoiceSeries?.startingNumber || 1).padStart(f8Config.customInvoiceSeries?.padDigits || 4, '0')}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>→</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb', fontSize: 12 }}>
                      {(f8Config.customInvoiceSeries?.prefix || '') + String((f8Config.customInvoiceSeries?.startingNumber || 1) + 1).padStart(f8Config.customInvoiceSeries?.padDigits || 4, '0')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 1: Document & Licenses */}
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📋</span> Document Title &amp; Trade Licenses
            </div>
            {renderFieldRow('documentTitle', 'Invoice Title', 'TAX INVOICE', { help: 'Appears at top-right of bill' })}
            {renderFieldRow('sellerTradeLicense', 'Seller Trade License', 'e.g. TL-894920', { help: 'Our company trade license' })}
            {renderFieldRow('buyerTradeLicense', 'Buyer Trade License', 'e.g. TL-990422', { help: 'Customer trade license' })}
            {renderFieldRow('paymentTerms', 'Payment Terms', 'e.g. 30 Days Credit / Immediate', { help: 'Payment terms label' })}

            {/* Section 2: Delivery & Reference Details */}
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🚚</span> Delivery &amp; Reference Card
            </div>
            {renderFieldRow('showLpoNo', 'LPO / PO No. Field', '', { showInput: false, help: 'Print PO / LPO reference number' })}
            {renderFieldRow('showDeliveryNoteNo', 'Delivery Note No. Field', '', { showInput: false, help: 'Print delivery note number' })}
            {renderFieldRow('placeOfSupply', 'Place of Supply', 'e.g. Dubai, UAE', { help: 'State / Emirate / Country' })}
            {renderFieldRow('salesperson', 'Salesperson Name', 'e.g. Mohammed Tariq', { help: 'Assigned sales representative' })}
            {renderFieldRow('vehicleRoute', 'Vehicle / Route', 'e.g. DXB-Van-04 (Business Bay)', { help: 'Delivery vehicle or route code' })}

            {/* Section 3: Bank Remittance Details */}
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🏦</span> Bank Details for Remittance
            </div>
            {renderFieldRow('bankName', 'Bank Name & Branch', 'e.g. EMIRATES NBD, Dubai', { help: 'Name of remittance bank' })}
            {renderFieldRow('accountName', 'Account / Beneficiary', 'e.g. ' + companyName, { help: 'Account holder name' })}
            {renderFieldRow('iban', 'IBAN / Account No.', 'e.g. AE45026000001015483231402', { help: 'Full IBAN or A/C number' })}
            {renderFieldRow('swift', 'SWIFT / BIC Code', 'e.g. EBILAEAD', { help: 'International bank identifier' })}

            {/* Section 4: Signatures & Stamps */}
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✍️</span> Signatures &amp; Stamps
            </div>
            {renderFieldRow('showStampSignature', "Receiver's Stamp Box", '', { showInput: false, help: "Show Receiver's Stamp & Signature box at bottom-left" })}
            {renderFieldRow('showAuthorisedSignatory', 'Authorised Signatory', '', { showInput: false, help: 'Show Company Authorised Signatory at bottom-right' })}
          </div>

          {/* Right Live Preview Column */}
          <div style={{ padding: '16px 20px', overflowY: 'auto', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>👁️ Live Preview Layout</span>
              <span style={{ fontSize: 10, background: '#1a365d', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>
                {isIndia ? 'India (GST Layout)' : 'International (Image One Layout)'}
              </span>
            </div>

            {/* Mock Invoice Card */}
            <div
              style={{
                flex: 1,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '14px',
                fontSize: 10,
                fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Top Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{companyName}</div>
                  <div style={{ color: '#64748b', fontSize: 9 }}>{activeCompany?.address || 'Warehouse No. 14, Industrial Area 2'}</div>
                  <div style={{ color: '#475569', fontSize: 9, marginTop: 2 }}>
                    Seller TRN: <b>{activeCompany?.gstin || activeCompany?.trn || '100294857100003'}</b>
                    {f8Config.sellerTradeLicense?.enabled && f8Config.sellerTradeLicense?.value && (
                      <span> | Trade License: <b>{f8Config.sellerTradeLicense.value}</b></span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {f8Config.documentTitle?.enabled && (
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#1a365d' }}>
                      {f8Config.documentTitle.value || 'TAX INVOICE'}
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: '#334155' }}>Invoice No: <b>INV-2026-0042</b></div>
                  <div style={{ fontSize: 9, color: '#334155' }}>Date: <b>18-Nov-2026</b></div>
                  {f8Config.paymentTerms?.enabled && (
                    <div style={{ fontSize: 9, color: '#64748b' }}>Terms: {f8Config.paymentTerms.value || '30 Days Credit'}</div>
                  )}
                  <div style={{ fontSize: 9, color: '#64748b' }}>Currency: <b>{currencySymbol}</b></div>
                </div>
              </div>

              {/* Two Boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {/* Bill To */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ background: '#f8fafc', fontWeight: 700, fontSize: 9, padding: '3px 6px', borderBottom: '1px solid #cbd5e1', color: '#1e293b' }}>
                    BILL TO (CUSTOMER DETAILS)
                  </div>
                  <div style={{ padding: '6px', fontSize: 9, lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 700 }}>Sample Customer LLC</div>
                    <div style={{ color: '#64748b' }}>Business Bay Tower, Dubai</div>
                    <div style={{ color: '#475569' }}>TRN No: 1245879654321123</div>
                    {f8Config.buyerTradeLicense?.enabled && f8Config.buyerTradeLicense?.value && (
                      <div style={{ color: '#475569' }}>Trade License: {f8Config.buyerTradeLicense.value}</div>
                    )}
                  </div>
                </div>

                {/* Delivery & Reference */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ background: '#f8fafc', fontWeight: 700, fontSize: 9, padding: '3px 6px', borderBottom: '1px solid #cbd5e1', color: '#1e293b' }}>
                    DELIVERY &amp; REFERENCE DETAILS
                  </div>
                  <div style={{ padding: '6px', fontSize: 9, lineHeight: 1.4 }}>
                    {f8Config.showLpoNo?.enabled && <div>LPO / PO No: <b>PO-2026-118</b></div>}
                    {f8Config.showDeliveryNoteNo?.enabled && <div>Delivery Note No: <b>DN-2026-0105</b></div>}
                    {f8Config.placeOfSupply?.enabled && <div>Place of Supply: <b>{f8Config.placeOfSupply.value || 'Dubai, UAE'}</b></div>}
                    {f8Config.salesperson?.enabled && f8Config.salesperson?.value && <div>Salesperson: <b>{f8Config.salesperson.value}</b></div>}
                    {f8Config.vehicleRoute?.enabled && f8Config.vehicleRoute?.value && <div>Vehicle / Route: <b>{f8Config.vehicleRoute.value}</b></div>}
                  </div>
                </div>
              </div>

              {/* Mini Items Table */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 4, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
                  <thead>
                    <tr style={{ background: '#1a365d', color: '#ffffff' }}>
                      <th style={{ padding: '3px 4px', textAlign: 'center', width: 25 }}>S/N</th>
                      <th style={{ padding: '3px 6px', textAlign: 'left' }}>Item Description</th>
                      <th style={{ padding: '3px 4px', textAlign: 'center', width: 35 }}>Unit</th>
                      <th style={{ padding: '3px 4px', textAlign: 'right', width: 35 }}>Qty</th>
                      <th style={{ padding: '3px 4px', textAlign: 'right', width: 45 }}>Rate</th>
                      <th style={{ padding: '3px 6px', textAlign: 'right', width: 55 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '3px 4px', textAlign: 'center' }}>1</td>
                      <td style={{ padding: '3px 6px' }}>Fresh Red Onions</td>
                      <td style={{ padding: '3px 4px', textAlign: 'center' }}>kg</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>20.00</td>
                      <td style={{ padding: '3px 4px', textAlign: 'right' }}>45.00</td>
                      <td style={{ padding: '3px 6px', textAlign: 'right' }}>900.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals & Bank Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 8, marginTop: 'auto' }}>
                {/* Bank Remittance Box */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '6px', fontSize: 8.5, background: '#fafafa' }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>Bank Details for Remittance:</div>
                  {f8Config.bankName?.enabled && <div>Bank: <b>{f8Config.bankName.value || 'EMIRATES NBD, Dubai'}</b></div>}
                  {f8Config.accountName?.enabled && <div>A/C Name: <b>{f8Config.accountName.value || companyName}</b></div>}
                  {f8Config.iban?.enabled && <div>IBAN: <b>{f8Config.iban.value || 'AE45026000001015483231402'}</b></div>}
                  {f8Config.swift?.enabled && <div>SWIFT: <b>{f8Config.swift.value || 'EBILAEAD'}</b></div>}
                </div>

                {/* Subtotal, VAT, Grand Total */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Subtotal:</span>
                    <b>900.00</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>VAT @ 5%:</span>
                    <b>45.00</b>
                  </div>
                  <div
                    style={{
                      background: '#1a365d',
                      color: 'white',
                      padding: '4px 6px',
                      borderRadius: 3,
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 800,
                      marginTop: 2,
                    }}
                  >
                    <span>GRAND TOTAL ({currencySymbol}):</span>
                    <span>945.00</span>
                  </div>
                </div>
              </div>

              {/* Bottom Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                {f8Config.showStampSignature?.enabled ? (
                  <div style={{ fontSize: 8.5, color: '#475569', textAlign: 'center', width: 140 }}>
                    <div style={{ height: 26, borderBottom: '1px dashed #94a3b8', marginBottom: 2 }} />
                    Receiver's Stamp &amp; Signature
                  </div>
                ) : <div />}
                {f8Config.showAuthorisedSignatory?.enabled ? (
                  <div style={{ fontSize: 8.5, color: '#475569', textAlign: 'center', width: 140 }}>
                    <div style={{ height: 26, borderBottom: '1px dashed #94a3b8', marginBottom: 2 }} />
                    For <b>{companyName}</b><br />Authorised Signatory
                  </div>
                ) : <div />}
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            onClick={handleResetDefaults}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              cursor: 'pointer',
              color: '#475569',
              fontWeight: 500,
            }}
          >
            🔄 Reset to Standard {country} Defaults
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveToast && (
              <span style={{ color: '#059669', fontSize: 12, fontWeight: 700 }}>
                ✓ Configuration Saved Successfully!
              </span>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '7px 16px',
                fontSize: 12,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                cursor: 'pointer',
                color: '#334155',
                fontWeight: 600,
              }}
            >
              Cancel (Esc)
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '7px 20px',
                fontSize: 12,
                background: '#059669',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                color: '#ffffff',
                fontWeight: 700,
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)',
              }}
            >
              Save Configuration (Ctrl+A)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
