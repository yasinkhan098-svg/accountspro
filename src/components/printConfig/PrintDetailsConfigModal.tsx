"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { CompanyPrintConfig, PrintFieldConfig } from '@/lib/printConfig/printConfigTypes';
import { printConfigService } from '@/lib/printConfig/printConfigService';
import { getCountryPrintPreset } from '@/lib/printConfig/countryPrintPresets';
import F8SalesPrintConfigModal from './F8SalesPrintConfigModal';

interface PrintDetailsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCompany: any;
  onConfigSaved?: (savedConfig: CompanyPrintConfig) => void;
}

export default function PrintDetailsConfigModal({
  isOpen,
  onClose,
  activeCompany,
  onConfigSaved,
}: PrintDetailsConfigModalProps) {
  const companyCode = String(activeCompany?.companyCode || activeCompany?.code || '10000').toUpperCase().trim();
  const companyName = activeCompany?.name || 'LedgerX Retail Limited';
  const country = activeCompany?.country || 'India';
  const currencySymbol = activeCompany?.currencySymbol || activeCompany?.baseCurrencySymbol || activeCompany?.currency || '₹';

  const preset = useMemo(() => getCountryPrintPreset(country), [country]);

  const [config, setConfig] = useState<CompanyPrintConfig>(() =>
    printConfigService.loadPrintConfig(companyCode, activeCompany)
  );

  const [saveToast, setSaveToast] = useState(false);
  const [showF8Modal, setShowF8Modal] = useState(false);

  // Sync when company or isOpen changes
  useEffect(() => {
    if (isOpen) {
      const loaded = printConfigService.loadPrintConfig(companyCode, activeCompany);
      setConfig(loaded);
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
  }, [isOpen, config]);

  if (!isOpen) return null;

  const updateField = (fieldKey: keyof Omit<CompanyPrintConfig, 'companyCode' | 'country' | 'customFields' | 'updatedAt'>, updates: Partial<PrintFieldConfig>) => {
    setConfig(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        ...updates,
      },
    }));
  };

  const handleAddCustomField = () => {
    const newField: PrintFieldConfig = {
      id: `custom_${Date.now()}`,
      label: 'Custom Label',
      value: '',
      enabled: true,
      isCustom: true,
    };
    setConfig(prev => ({
      ...prev,
      customFields: [...prev.customFields, newField],
    }));
  };

  const updateCustomField = (index: number, updates: Partial<PrintFieldConfig>) => {
    setConfig(prev => {
      const updated = [...prev.customFields];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, customFields: updated };
    });
  };

  const removeCustomField = (index: number) => {
    setConfig(prev => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index),
    }));
  };

  const handleResetToCountryDefaults = () => {
    if (confirm(`Reset all print labels and placeholders to standard ${country} presets?`)) {
      const defaults = printConfigService.getDefaultPrintConfig(activeCompany);
      setConfig(defaults);
    }
  };

  const handleSave = async () => {
    await printConfigService.savePrintConfig(companyCode, config, activeCompany);
    if (onConfigSaved) onConfigSaved(config);
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 600);
  };

  // Helper to format field for preview
  const formatVal = (field?: PrintFieldConfig | null, sampleFallback = 'xxxxx') => {
    if (!field || !field.enabled) return null;
    return field.value && field.value.trim() ? field.value.trim() : sampleFallback;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '95vw',
          maxWidth: 1240,
          height: '92vh',
          maxHeight: 880,
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '2px solid #0f3c64',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            background: 'linear-gradient(90deg, #0f3c64 0%, #1e5c94 100%)',
            color: '#ffffff',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🧾</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 0.5 }}>
                Details Print Configuration — {companyName}
              </div>
              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 1 }}>
                Country: <b>{country}</b> • Company Code: <b>{companyCode}</b> • Thermal Slip Format
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowF8Modal(true)}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
              title="Configure F8 Sales Invoice Print layout, Trade Licenses, Delivery and Bank Remittance details"
            >
              📑 F8 Sales Invoice Print Configuration
            </button>
            <button
              type="button"
              onClick={handleResetToCountryDefaults}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '6px 12px',
                borderRadius: 4,
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              🔄 Reset to {country} Presets
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                padding: '7px 18px',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              💾 Save & Apply (Ctrl+A)
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              ✕ Close (Esc)
            </button>
          </div>
        </div>

        {/* Toast alert on save */}
        {saveToast && (
          <div
            style={{
              background: '#059669',
              color: '#ffffff',
              textAlign: 'center',
              padding: '6px 0',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          >
            ✓ Print configuration saved successfully!
          </div>
        )}

        {/* Content Body: Left Form + Right Live Preview */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* LEFT PANE: Form Configuration */}
          <div
            style={{
              flex: '1 1 60%',
              overflowY: 'auto',
              padding: '18px 24px',
              background: '#f8fafc',
              borderRight: '1px solid #cbd5e1',
            }}
          >
            {/* Instruction Notice */}
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 6,
                padding: '8px 12px',
                marginBottom: 16,
                fontSize: 11.5,
                color: '#1e40af',
                lineHeight: 1.4,
              }}
            >
              <b>💡 Print Rule:</b> Only fields with the checkbox <b>[✓]</b> enabled will be printed on the receipt. If a field is enabled but left blank, <b>xxxxx</b> will be printed on the receipt.
            </div>

            {/* 1. Header & Store Tagline */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0f3c64', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🏪</span> Store Tagline & Branch Sub-heading
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <input
                  type="checkbox"
                  id="chk-tagline"
                  checked={config.storeTagline.enabled}
                  onChange={e => updateField('storeTagline', { enabled: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="chk-tagline" style={{ width: 170, fontSize: 12, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Store Sub-heading / Tagline:
                </label>
                <input
                  type="text"
                  value={config.storeTagline.value}
                  onChange={e => updateField('storeTagline', { value: e.target.value })}
                  placeholder="e.g. LEDGERX SMART POINT or SUPER STORE"
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="chk-care"
                  checked={config.customerCarePhone.enabled}
                  onChange={e => updateField('customerCarePhone', { enabled: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="chk-care" style={{ width: 170, fontSize: 12, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Customer Care Phone:
                </label>
                <input
                  type="text"
                  value={config.customerCarePhone.value}
                  onChange={e => updateField('customerCarePhone', { value: e.target.value })}
                  placeholder="e.g. 18008910001"
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }}
                />
              </div>
            </div>

            {/* 2. Country-Specific Legal & Regulatory IDs */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#0f3c64', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🏛️</span> Country Legal & Regulatory IDs ({country})
                </div>
                <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                  Preset: {country}
                </span>
              </div>

              {/* Business ID (CIN equivalent) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <input
                  type="checkbox"
                  id="chk-bizid"
                  checked={config.businessId.enabled}
                  onChange={e => updateField('businessId', { enabled: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <div style={{ width: 170 }}>
                  <input
                    type="text"
                    value={config.businessId.label}
                    onChange={e => updateField('businessId', { label: e.target.value })}
                    title="Click to edit label name"
                    style={{ width: '100%', fontSize: 11.5, fontWeight: 700, color: '#0f172a', border: '1px dashed #94a3b8', padding: '3px 6px', borderRadius: 3 }}
                  />
                </div>
                <input
                  type="text"
                  value={config.businessId.value}
                  onChange={e => updateField('businessId', { value: e.target.value })}
                  placeholder={`e.g. ${preset.businessIdPlaceholder}`}
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }}
                />
              </div>

              {/* Food / Shop License (FSSAI equivalent) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="chk-foodlic"
                  checked={config.foodLicense.enabled}
                  onChange={e => updateField('foodLicense', { enabled: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <div style={{ width: 170 }}>
                  <input
                    type="text"
                    value={config.foodLicense.label}
                    onChange={e => updateField('foodLicense', { label: e.target.value })}
                    title="Click to edit label name"
                    style={{ width: '100%', fontSize: 11.5, fontWeight: 700, color: '#0f172a', border: '1px dashed #94a3b8', padding: '3px 6px', borderRadius: 3 }}
                  />
                </div>
                <input
                  type="text"
                  value={config.foodLicense.value}
                  onChange={e => updateField('foodLicense', { value: e.target.value })}
                  placeholder={`e.g. ${preset.foodLicensePlaceholder}`}
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }}
                />
              </div>
            </div>

            {/* 3. Loyalty / Member Card & Customer Mobile */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0f3c64', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>💳</span> Loyalty / Customer Card on Receipt
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <input
                  type="checkbox"
                  id="chk-card"
                  checked={config.customerCard.enabled}
                  onChange={e => updateField('customerCard', { enabled: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <div style={{ width: 170 }}>
                  <input
                    type="text"
                    value={config.customerCard.label}
                    onChange={e => updateField('customerCard', { label: e.target.value })}
                    style={{ width: '100%', fontSize: 11.5, fontWeight: 700, color: '#0f172a', border: '1px dashed #94a3b8', padding: '3px 6px', borderRadius: 3 }}
                  />
                </div>
                <div style={{ flex: 1, fontSize: 11.5, color: '#475569', fontStyle: 'italic', background: '#f1f5f9', padding: '6px 10px', borderRadius: 4 }}>
                  📱 Auto-populated from Customer Mobile during POS counter sale. (Prints &apos;xxxxx&apos; if no phone entered).
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="chk-cardbal"
                  checked={config.customerBalance.enabled}
                  onChange={e => updateField('customerBalance', { enabled: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <div style={{ width: 170 }}>
                  <input
                    type="text"
                    value={config.customerBalance.label}
                    onChange={e => updateField('customerBalance', { label: e.target.value })}
                    style={{ width: '100%', fontSize: 11.5, fontWeight: 700, color: '#0f172a', border: '1px dashed #94a3b8', padding: '3px 6px', borderRadius: 3 }}
                  />
                </div>
                <input
                  type="text"
                  value={config.customerBalance.value}
                  onChange={e => updateField('customerBalance', { value: e.target.value })}
                  placeholder="e.g. 0.00"
                  style={{ width: 120, padding: '6px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }}
                />
              </div>
            </div>

            {/* 4. Online, Support & Policy Info */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#0f3c64', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🌐</span> Website, Support Email & Policy Link
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <input
                  type="checkbox"
                  id="chk-web"
                  checked={config.website.enabled}
                  onChange={e => updateField('website', { enabled: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="chk-web" style={{ width: 170, fontSize: 12, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Website URL:
                </label>
                <input
                  type="text"
                  value={config.website.value}
                  onChange={e => updateField('website', { value: e.target.value })}
                  placeholder="e.g. www.ledgerxretail.com"
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <input
                  type="checkbox"
                  id="chk-email"
                  checked={config.email.enabled}
                  onChange={e => updateField('email', { enabled: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="chk-email" style={{ width: 170, fontSize: 12, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Customer Care Email:
                </label>
                <input
                  type="email"
                  value={config.email.value}
                  onChange={e => updateField('email', { value: e.target.value })}
                  placeholder="e.g. customercare@ledgerx.com"
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="chk-policy"
                  checked={config.privacyPolicy.enabled}
                  onChange={e => updateField('privacyPolicy', { enabled: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="chk-policy" style={{ width: 170, fontSize: 12, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Policy Notice / Link:
                </label>
                <input
                  type="text"
                  value={config.privacyPolicy.value}
                  onChange={e => updateField('privacyPolicy', { value: e.target.value })}
                  placeholder="e.g. https://ledgerxretail.com/privacy-policy.html"
                  style={{ flex: 1, padding: '6px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }}
                />
              </div>
            </div>

            {/* 5. Custom Dynamic Fields */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#0f3c64', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>➕</span> Custom Fields (Manual Fields on Slip)
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '5px 12px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Add Custom Field
                </button>
              </div>

              {config.customFields.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: '#64748b', fontStyle: 'italic', background: '#f8fafc', borderRadius: 4 }}>
                  No custom fields added yet. Click &quot;+ Add Custom Field&quot; above to add custom lines (e.g. Drug License, Halal Reg No, Branch Manager, etc.).
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {config.customFields.map((field, idx) => (
                    <div key={field.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={field.enabled}
                        onChange={e => updateCustomField(idx, { enabled: e.target.checked })}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                        title="Toggle to enable/disable printing"
                      />
                      <input
                        type="text"
                        value={field.label}
                        onChange={e => updateCustomField(idx, { label: e.target.value })}
                        placeholder="Field Label (e.g. Drug Lic)"
                        style={{ width: 160, padding: '6px 8px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, fontWeight: 600 }}
                      />
                      <span style={{ fontWeight: 'bold' }}>:</span>
                      <input
                        type="text"
                        value={field.value}
                        onChange={e => updateCustomField(idx, { value: e.target.value })}
                        placeholder="Value (or leave empty for 'xxxxx')"
                        style={{ flex: 1, padding: '6px 8px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }}
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomField(idx)}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          borderRadius: 4,
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                        title="Remove field"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANE: Live Thermal Receipt Preview */}
          <div
            style={{
              flex: '1 1 40%',
              background: '#334155',
              padding: '16px 20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ color: '#f8fafc', fontSize: 12, fontWeight: 700, marginBottom: 10, letterSpacing: 0.5, textAlign: 'center' }}>
              👁️ LIVE THERMAL RECEIPT SLIP PREVIEW
            </div>

            {/* 78mm Receipt Paper Container */}
            <div
              style={{
                width: '100%',
                maxWidth: 340,
                background: '#ffffff',
                color: '#000000',
                padding: '12px 14px',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: 10,
                lineHeight: 1.25,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                border: '1px solid #94a3b8',
                borderRadius: 2,
              }}
            >
              {/* Logo & Header */}
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #000', margin: '0 auto 4px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 22, fontFamily: 'sans-serif' }}>
                  L
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {companyName}
                </div>

                {/* Tagline */}
                {formatVal(config.storeTagline) && (
                  <div style={{ fontSize: 9.5, fontWeight: 'bold', letterSpacing: 0.5 }}>
                    {formatVal(config.storeTagline)}
                  </div>
                )}

                <div style={{ fontSize: 8.5 }}>
                  {activeCompany?.address || 'GF, Ashoka Complex, Sitarganj'}
                </div>

                {/* Customer Care Phone */}
                {formatVal(config.customerCarePhone) && (
                  <div style={{ fontSize: 8.5 }}>
                    Customer care : {formatVal(config.customerCarePhone)}
                  </div>
                )}

                {/* Country Legal Business ID */}
                {formatVal(config.businessId) && (
                  <div style={{ fontSize: 8.5 }}>
                    {config.businessId.label} : {formatVal(config.businessId)}
                  </div>
                )}

                <div style={{ fontSize: 8.5 }}>
                  {preset.taxIdLabel}- {activeCompany?.gstin || (preset.taxIdPlaceholder)}
                </div>

                {/* Country Food / Shop License */}
                {formatVal(config.foodLicense) && (
                  <div style={{ fontSize: 8.5 }}>
                    {config.foodLicense.label} - {formatVal(config.foodLicense)}
                  </div>
                )}

                {/* Custom Fields in Header */}
                {config.customFields.map((cf, i) => {
                  const val = formatVal(cf);
                  if (!val) return null;
                  return (
                    <div key={cf.id || i} style={{ fontSize: 8.5 }}>
                      {cf.label} : {val}
                    </div>
                  );
                })}
              </div>

              {/* Savings Banner */}
              <div style={{ textAlign: 'center', margin: '5px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '3px 0' }}>
                <div style={{ fontSize: 11, fontWeight: 'bold' }}>
                  You have saved {currencySymbol}150.00
                </div>
              </div>

              {/* Invoice Meta */}
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 'bold' }}>TAX INVOICE</div>
                <div style={{ fontSize: 7.5 }}>xxxxxxxxxxxxx Original for Recipient xxxxxxxxxxxxx</div>
              </div>

              <div style={{ fontSize: 8.5, marginBottom: 4 }}>
                <div>Place of Supply: {activeCompany?.stateCode || country}</div>
                <div>Customer Type: URP</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
                  <span>Bill No: CASH6608</span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

              {/* Sample Items Table */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, fontWeight: 'bold', marginBottom: 3 }}>
                <span style={{ width: '48%' }}>Item Description</span>
                <span style={{ width: '18%', textAlign: 'right' }}>Price ({currencySymbol})</span>
                <span style={{ width: '14%', textAlign: 'center' }}>Qty</span>
                <span style={{ width: '20%', textAlign: 'right' }}>Value ({currencySymbol})</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />

              <div style={{ fontSize: 8.5, marginBottom: 3 }}>
                <div style={{ fontSize: 7.5, color: '#333' }}>
                  {(activeCompany?.country || 'India').toLowerCase() === 'india'
                    ? '1) CGST @ 9.00% SGST @ 9.00%'
                    : `1) ${preset.taxIdLabel.split(' ')[0] || 'Tax'} @ 5.00% (${currencySymbol}15.05)`
                  }
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ width: '48%', fontWeight: 'bold' }}>732393 APACEXPRCOOL</span>
                  <span style={{ width: '18%', textAlign: 'right' }}>{currencySymbol}316.02</span>
                  <span style={{ width: '14%', textAlign: 'center' }}>1 CAR</span>
                  <span style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>{currencySymbol}316.02</span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5 }}>
                <span>Items: 1  Qty: 1</span>
                <span style={{ fontWeight: 'bold' }}>{currencySymbol}316.02</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, fontWeight: 'bold', margin: '3px 0' }}>
                <span>Total Amount Paid</span>
                <span>{currencySymbol}316.02</span>
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

              {/* Symmetrical GST Breakup Table */}
              <div style={{ textAlign: 'center', fontSize: 7.5, fontWeight: 'bold', marginBottom: 2 }}>
                -------GST Breakup Details--------Amount ({currencySymbol})
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7.5, fontWeight: 'bold' }}>
                <span>Taxable</span>
                <span>CGST</span>
                <span>SGST</span>
                <span>Total</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7.5 }}>
                <span>{currencySymbol}267.81</span>
                <span>{currencySymbol}24.11</span>
                <span>{currencySymbol}24.11</span>
                <span>{currencySymbol}316.02</span>
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

              {/* Loyalty & Card section */}
              <div style={{ fontSize: 7.5, lineHeight: 1.4 }}>
                <div>PaymentRefNo# U1FX{Date.now().toString().slice(-10)}</div>
                {formatVal(config.customerCard) && (
                  <div>
                    {config.customerCard.label} :{formatVal(config.customerCard, '987XXXX321')}
                    {formatVal(config.customerBalance) && ` ${config.customerBalance.label} :${formatVal(config.customerBalance, '0.00')}`}
                  </div>
                )}
                <div>Terms &amp; Conditions Apply</div>
              </div>

              {/* QR Code Placeholder */}
              <div style={{ margin: '6px 0', padding: 4, border: '1px solid #000', borderRadius: 3, textAlign: 'center' }}>
                <div style={{ fontSize: 8, fontWeight: 'bold' }}>[ 📲 SCAN &amp; PAY WITH ANY UPI APP ]</div>
                <div style={{ fontSize: 7, margin: '2px 0' }}>Payee: {companyName}</div>
              </div>

              {/* Online Footer & Policy */}
              <div style={{ textAlign: 'center', fontSize: 7.5, lineHeight: 1.3 }}>
                <div>* Thank You for Shopping with us *</div>
                {formatVal(config.website) && (
                  <div>Website: {formatVal(config.website)}</div>
                )}
                {formatVal(config.email) && (
                  <div>Customer Care email &amp; {formatVal(config.email)}</div>
                )}
                {formatVal(config.privacyPolicy) && (
                  <div style={{ marginTop: 2 }}>
                    Please refer to our Website link<br />
                    {formatVal(config.privacyPolicy)}<br />
                    for Privacy Policy
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showF8Modal && (
        <F8SalesPrintConfigModal
          isOpen={showF8Modal}
          onClose={() => setShowF8Modal(false)}
          activeCompany={activeCompany}
          onSaved={(savedF8) => {
            setConfig(prev => ({
              ...prev,
              f8SalesConfig: savedF8,
            }));
            if (onConfigSaved) {
              onConfigSaved({
                ...config,
                f8SalesConfig: savedF8,
              });
            }
          }}
        />
      )}
    </div>
  );
}
