"use client";
import React, { useState, useEffect } from 'react';
import { 
  LANUser, 
  UserPermissions, 
  DEFAULT_ADMIN_PERMISSIONS, 
  DEFAULT_OPERATOR_PERMISSIONS,
  permissionGuard 
} from '@/lib/permissionGuard';
import { lanUserManagementService, HostLANInfo } from '@/lib/lanUserManagementService';
import { companyDataFolderService } from '@/lib/companyDataFolderService';

interface RoleManagementViewProps {
  goBack: () => void;
  availableCompanies?: any[];
  activeCompany?: any;
}

export default function RoleManagementView({ goBack, availableCompanies = [], activeCompany }: RoleManagementViewProps) {
  const activeCompanyCode = activeCompany 
    ? companyDataFolderService.getCompanyFolderCode(activeCompany, availableCompanies) 
    : lanUserManagementService.getActiveCompanyCode();
  const activeCompanyName = activeCompany?.name || 'Current Company';

  const [users, setUsers] = useState<LANUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostInfo, setHostInfo] = useState<HostLANInfo | null>(null);
  const [editingUser, setEditingUser] = useState<LANUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'vouchers' | 'reports' | 'modules' | 'registers' | 'masters'>('vouchers');
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formIsAdmin, setFormIsAdmin] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formCompanies, setFormCompanies] = useState<string[]>([activeCompanyCode]);
  const [formPerms, setFormPerms] = useState<UserPermissions>(DEFAULT_OPERATOR_PERMISSIONS);

  useEffect(() => {
    loadData();
  }, [activeCompanyCode]);

  const loadData = async () => {
    setLoading(true);
    const [uList, hInfo] = await Promise.all([
      lanUserManagementService.getUsers(activeCompanyCode, activeCompanyName),
      lanUserManagementService.getHostLANInfo(),
    ]);
    setUsers(uList);
    setHostInfo(hInfo);
    setLoading(false);
  };

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateNew = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormFullName('');
    setFormPassword('');
    setFormIsAdmin(false);
    setFormIsActive(true);
    setFormCompanies([activeCompanyCode]);
    setFormPerms(JSON.parse(JSON.stringify(DEFAULT_OPERATOR_PERMISSIONS)));
    setShowModal(true);
  };

  const handleEdit = (u: LANUser) => {
    setEditingUser(u);
    setFormUsername(u.username);
    setFormFullName(u.fullName || '');
    setFormPassword(u.password || '');
    setFormIsAdmin(!!u.isAdmin);
    setFormIsActive(u.isActive !== false);
    setFormCompanies(u.assignedCompanyCodes && u.assignedCompanyCodes.length > 0 ? u.assignedCompanyCodes : [activeCompanyCode]);
    setFormPerms(JSON.parse(JSON.stringify(u.permissions || DEFAULT_OPERATOR_PERMISSIONS)));
    setShowModal(true);
  };

  const handleDelete = async (u: LANUser) => {
    if (u.username.toLowerCase() === 'admin') {
      alert('The root "admin" user cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete user "${u.username}" from ${activeCompanyName}?`)) return;

    await lanUserManagementService.deleteUser(u.id, activeCompanyCode);
    setUsers(prev => prev.filter(x => x.id !== u.id));
    showToastMsg(`User "${u.username}" deleted from ${activeCompanyName}.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim()) {
      alert('Username is required!');
      return;
    }

    const cleanUsername = formUsername.trim().toLowerCase();
    const existing = users.find(u => u.username.toLowerCase() === cleanUsername && (!editingUser || u.id !== editingUser.id));
    if (existing) {
      alert(`User with username "${formUsername}" already exists for this company!`);
      return;
    }

    const updatedUser: LANUser = {
      id: editingUser ? editingUser.id : `usr_${Date.now()}`,
      username: cleanUsername,
      fullName: formFullName.trim() || formUsername.trim(),
      password: formPassword.trim(),
      isAdmin: formIsAdmin,
      isActive: formIsActive,
      assignedCompanyCodes: formCompanies.length > 0 ? formCompanies : [activeCompanyCode],
      createdAt: editingUser?.createdAt || new Date().toISOString(),
      permissions: formIsAdmin ? DEFAULT_ADMIN_PERMISSIONS : formPerms,
    };

    await lanUserManagementService.saveUser(updatedUser, activeCompanyCode);
    await loadData();
    setShowModal(false);
    showToastMsg(`User "${updatedUser.username}" saved for ${activeCompanyName}!`);
  };

  const copyLANLink = () => {
    const url = hostInfo?.lanUrl || `http://127.0.0.1:45454`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToastMsg('LAN Access Link copied to clipboard!');
    }
  };

  // Preset helpers
  const applyPreset = (preset: 'purchase_only' | 'sales_only' | 'all' | 'clear') => {
    if (preset === 'all') {
      setFormPerms(JSON.parse(JSON.stringify(DEFAULT_ADMIN_PERMISSIONS)));
    } else if (preset === 'clear') {
      const empty: any = JSON.parse(JSON.stringify(DEFAULT_OPERATOR_PERMISSIONS));
      for (const cat in empty) {
        for (const k in empty[cat]) empty[cat][k] = false;
      }
      setFormPerms(empty);
    } else if (preset === 'purchase_only') {
      setFormPerms({
        vouchers: {
          Purchase: true,
          'Debit Note': true,
          Sales: false,
          'Credit Note': false,
          Payment: false,
          Receipt: false,
          Contra: false,
          Journal: false,
          'Sales Quotation': false,
          'POS Sale': false,
        },
        registers: {
          'Purchase Register': true,
          'Sales Register': false,
          'Day Book': false,
          'Payment Register': false,
          'Receipt Register': false,
          'Journal Register': false,
          'Contra Register': false,
          'Debit Note Register': true,
          'Credit Note Register': false,
          'Quotation Register': false,
        },
        modules: {
          BOM: false,
          Manufacturing: false,
          BankStatement: false,
          PurchaseOrder: true,
        },
        reports: {
          BalanceSheet: false,
          ProfitLoss: false,
          TrialBalance: false,
          StockSummary: true,
          GSTReports: false,
          AuditTrail: false,
        },
        masters: {
          createLedger: false,
          alterLedger: false,
          createStockItem: true,
          alterStockItem: false,
          deleteMaster: false,
          deleteVoucher: false,
        },
      });
      showToastMsg('Applied: Purchase Dept Role Preset (Sales, P&L, Banking hidden)');
    } else if (preset === 'sales_only') {
      setFormPerms({
        vouchers: {
          Purchase: false,
          'Debit Note': false,
          Sales: true,
          'Credit Note': true,
          Payment: false,
          Receipt: true,
          Contra: false,
          Journal: false,
          'Sales Quotation': true,
          'POS Sale': true,
        },
        registers: {
          'Purchase Register': false,
          'Sales Register': true,
          'Day Book': true,
          'Payment Register': false,
          'Receipt Register': true,
          'Journal Register': false,
          'Contra Register': false,
          'Debit Note Register': false,
          'Credit Note Register': true,
          'Quotation Register': true,
        },
        modules: {
          BOM: false,
          Manufacturing: false,
          BankStatement: false,
          PurchaseOrder: false,
        },
        reports: {
          BalanceSheet: false,
          ProfitLoss: false,
          TrialBalance: false,
          StockSummary: true,
          GSTReports: false,
          AuditTrail: false,
        },
        masters: {
          createLedger: false,
          alterLedger: false,
          createStockItem: false,
          alterStockItem: false,
          deleteMaster: false,
          deleteVoucher: false,
        },
      });
      showToastMsg('Applied: Sales & Billing Role Preset (Purchase, P&L hidden)');
    }
  };

  const toggleVoucherPerm = (key: keyof UserPermissions['vouchers']) => {
    setFormPerms(p => ({
      ...p,
      vouchers: { ...p.vouchers, [key]: !p.vouchers[key] }
    }));
  };

  const toggleReportPerm = (key: keyof UserPermissions['reports']) => {
    setFormPerms(p => ({
      ...p,
      reports: { ...p.reports, [key]: !p.reports[key] }
    }));
  };

  const toggleModulePerm = (key: keyof UserPermissions['modules']) => {
    setFormPerms(p => ({
      ...p,
      modules: { ...p.modules, [key]: !p.modules[key] }
    }));
  };

  const toggleRegisterPerm = (key: keyof UserPermissions['registers']) => {
    setFormPerms(p => ({
      ...p,
      registers: { ...p.registers, [key]: !p.registers[key] }
    }));
  };

  const toggleMasterPerm = (key: keyof UserPermissions['masters']) => {
    setFormPerms(p => ({
      ...p,
      masters: { ...p.masters, [key]: !p.masters[key] }
    }));
  };

  const activeLanUser = permissionGuard.getCurrentUser();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#1e293b', fontFamily: 'Segoe UI, sans-serif' }}>
      
      {/* Top Header */}
      <div style={{ background: '#0f3c64', color: '#fff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={goBack} 
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            ← Esc Back
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>👥 User & Role Management</span>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 4, fontSize: 13, fontWeight: 'normal' }}>
                🏢 {activeCompanyName} [{activeCompanyCode}]
              </span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
              Independent Per-Company User Roles • 100% Offline Local Area Network
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button 
            onClick={handleCreateNew}
            style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontWeight: 'bold', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 4px rgba(16,185,129,0.3)' }}
          >
            ➕ Add New LAN User
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div style={{ background: '#1e293b', color: '#38bdf8', padding: '10px 20px', fontSize: 13, fontWeight: 600, textAlign: 'center', borderBottom: '2px solid #38bdf8' }}>
          {toast}
        </div>
      )}

      {/* Scrollable Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        
        {/* LAN Server Control Panel Banner */}
        <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 16, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                🌐
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 'bold', fontSize: 15, color: '#0f3c64' }}>Offline LAN Multi-User Server:</span>
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                    ONLINE & LISTENING (Port 45454)
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                  Other computers on this same Wi-Fi / LAN router can connect directly to this Host PC without internet!
                </div>
              </div>
            </div>

            {/* Quick Actions for LAN Access */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#0f3c64' }}>
                LAN Address: {hostInfo?.lanUrl || 'http://127.0.0.1:45454'}
              </div>
              
              <button 
                onClick={copyLANLink}
                style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                title="Copy URL to paste into client computer's browser"
              >
                {copied ? '✓ Copied!' : '📋 Copy LAN Link'}
              </button>

              <a 
                href="/downloads/LedgerX-Client.exe"
                download="LedgerX-Client.exe"
                style={{ background: '#4f46e5', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                title="Download 120KB client app to copy to other computers on LAN"
              >
                📥 Download LAN Client App (.exe)
              </a>
            </div>
          </div>
        </div>

        {/* Current Active LAN Session Indicator */}
        {activeLanUser && (
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <div>
              <b>Logged in as:</b> <span style={{ color: '#b45309', fontWeight: 'bold' }}>{activeLanUser.fullName} (@{activeLanUser.username})</span> • Role: <b>{activeLanUser.isAdmin ? '👑 Administrator (Full Access)' : '🔒 Restricted Role'}</b>
            </div>
            <button 
              onClick={() => {
                permissionGuard.setCurrentUser(null);
                showToastMsg('Switched back to Primary Admin session.');
              }}
              style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' }}
            >
              Log Out of LAN User Session
            </button>
          </div>
        )}

        {/* User Roster Table */}
        <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: 14, color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Registered LAN Users for {activeCompanyName} ({users.length})</span>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 'normal' }}>
              Data stored in: <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, color: '#0f3c64', fontWeight: 600 }}>data/{activeCompanyCode}/users.json</code>
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>User / Account</th>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Role Type</th>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Permitted Vouchers</th>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Permitted Reports</th>
                <th style={{ padding: '10px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const allowedVouchers = u.isAdmin 
                  ? 'All Vouchers' 
                  : Object.entries(u.permissions?.vouchers || {})
                      .filter(([_, v]) => v)
                      .map(([k]) => k)
                      .join(', ') || 'None';

                const allowedReports = u.isAdmin 
                  ? 'All Reports & Financials' 
                  : Object.entries(u.permissions?.reports || {})
                      .filter(([_, v]) => v)
                      .map(([k]) => k)
                      .join(', ') || 'None';

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f3c64' }}>{u.fullName}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>@{u.username}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.isAdmin ? (
                        <span style={{ background: '#fef08a', color: '#854d0e', padding: '3px 8px', borderRadius: 4, fontWeight: 'bold', fontSize: 11 }}>
                          👑 Administrator
                        </span>
                      ) : (
                        <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
                          🔒 Restricted Operator
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                      <div style={{ fontSize: 12, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={allowedVouchers}>
                        {allowedVouchers}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                      <div style={{ fontSize: 12, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={allowedReports}>
                        {allowedReports}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {u.isActive !== false ? (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 'bold' }}>Active</span>
                      ) : (
                        <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 'bold' }}>Disabled</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button 
                          onClick={() => {
                            permissionGuard.setCurrentUser(u);
                            showToastMsg(`Switched session to "${u.username}". Testing restrictions in real-time.`);
                          }}
                          style={{ background: '#f1f5f9', color: '#0f3c64', border: '1px solid #cbd5e1', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                          title="Simulate / test this user role on this machine"
                        >
                          🧪 Test Role
                        </button>
                        <button 
                          onClick={() => handleEdit(u)}
                          style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                        >
                          ✏️ Edit
                        </button>
                        {u.username.toLowerCase() !== 'admin' && (
                          <button 
                            onClick={() => handleDelete(u)}
                            style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Create & Edit Modal with Granular Permission Checkboxes */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: '#fff', borderRadius: 10, width: 780, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #cbd5e1' }}>
            
            {/* Modal Header */}
            <div style={{ background: '#0f3c64', color: '#fff', padding: '14px 20px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                {editingUser ? `✏️ Configure User & Role: ${editingUser.username}` : '➕ Create New LAN User & Permissions'}
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              
              {/* Active Company Scope Badge */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '8px 14px', marginBottom: 14, fontSize: 12, color: '#1e40af', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🏢 Managing Access For: <b>{activeCompanyName}</b></span>
                <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: 4, fontWeight: 'bold', fontFamily: 'monospace' }}>
                  Folder: {activeCompanyCode}
                </span>
              </div>

              {/* Basic User Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Username (Login ID) *</label>
                  <input 
                    type="text" 
                    value={formUsername} 
                    onChange={e => setFormUsername(e.target.value)}
                    required
                    placeholder="e.g. rahul_pur, amit_sales"
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Full Name / Department</label>
                  <input 
                    type="text" 
                    value={formFullName} 
                    onChange={e => setFormFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma (Purchase Executive)"
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Password (Optional / Plain)</label>
                  <input 
                    type="password" 
                    value={formPassword} 
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder="Leave blank for passwordless LAN login"
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13 }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingTop: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#0f3c64' }}>
                    <input 
                      type="checkbox" 
                      checked={formIsAdmin} 
                      onChange={e => setFormIsAdmin(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    👑 Full Administrator (No restrictions)
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#166534' }}>
                    <input 
                      type="checkbox" 
                      checked={formIsActive} 
                      onChange={e => setFormIsActive(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    Active Status
                  </label>
                </div>
              </div>

              {/* Granular Permissions Section (Only if not full Admin) */}
              {!formIsAdmin && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 14, color: '#0f3c64' }}>
                      🛡️ Granular Role & Access Control (Tick what this user can do)
                    </div>
                    
                    {/* Quick Preset Buttons */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button 
                        type="button" 
                        onClick={() => applyPreset('purchase_only')} 
                        style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⚡ Purchase Only
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyPreset('sales_only')} 
                        style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⚡ Sales Only
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyPreset('all')} 
                        style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
                      >
                        Select All
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyPreset('clear')} 
                        style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: 14 }}>
                    {[
                      { key: 'vouchers', label: '📑 Vouchers Allowed' },
                      { key: 'reports', label: '📊 Financial Reports' },
                      { key: 'registers', label: '📋 Day Book & Registers' },
                      { key: 'modules', label: '📦 BOM & Banking' },
                      { key: 'masters', label: '🛡️ Master & Delete Actions' },
                    ].map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setActiveTab(t.key as any)}
                        style={{
                          padding: '8px 14px',
                          border: 'none',
                          background: activeTab === t.key ? '#0f3c64' : 'transparent',
                          color: activeTab === t.key ? '#fff' : '#64748b',
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: 'pointer',
                          borderRadius: '6px 6px 0 0',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab 1: Vouchers Checkbox Grid */}
                  {activeTab === 'vouchers' && (
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 16 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                        Only the selected vouchers will be visible & accessible to this user. All other voucher types will be completely disabled.
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {[
                          { key: 'Purchase', label: 'Purchase Voucher (F9)', highlight: '#d97706' },
                          { key: 'Sales', label: 'Sales Voucher (F8)', highlight: '#16a34a' },
                          { key: 'Payment', label: 'Payment Voucher (F5)', highlight: '#2563eb' },
                          { key: 'Receipt', label: 'Receipt Voucher (F6)', highlight: '#059669' },
                          { key: 'Contra', label: 'Contra Voucher (F4)', highlight: '#9333ea' },
                          { key: 'Journal', label: 'Journal Voucher (F7)', highlight: '#475569' },
                          { key: 'Debit Note', label: 'Debit Note (Purchase Return)', highlight: '#ea580c' },
                          { key: 'Credit Note', label: 'Credit Note (Sales Return)', highlight: '#0891b2' },
                          { key: 'Sales Quotation', label: 'Sales Quotation / Estimate', highlight: '#0d9488' },
                          { key: 'POS Sale', label: '🛒 POS Sale (Retail Touch Counter)', highlight: '#059669' },
                        ].map(v => (
                          <label 
                            key={v.key}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 8, 
                              padding: '8px 10px', 
                              background: formPerms.vouchers[v.key as keyof UserPermissions['vouchers']] ? '#f0fdf4' : '#f8fafc',
                              border: `1px solid ${formPerms.vouchers[v.key as keyof UserPermissions['vouchers']] ? '#86efac' : '#e2e8f0'}`,
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            <input 
                              type="checkbox"
                              checked={!!formPerms.vouchers[v.key as keyof UserPermissions['vouchers']]}
                              onChange={() => toggleVoucherPerm(v.key as any)}
                              style={{ width: 16, height: 16 }}
                            />
                            {v.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Financial Reports Checkbox Grid */}
                  {activeTab === 'reports' && (
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 16 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                        Control visibility of sensitive financial figures like Net Profit, Balances, and Tax Audits.
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                        {[
                          { key: 'BalanceSheet', label: 'Balance Sheet (B) - Full Assets & Liabilities' },
                          { key: 'ProfitLoss', label: 'Profit & Loss Account (P) - Net Profit / Income' },
                          { key: 'TrialBalance', label: 'Trial Balance - Complete Ledger Balances' },
                          { key: 'StockSummary', label: 'Stock Summary (S) - Warehouse Quantities & Value' },
                          { key: 'GSTReports', label: 'GSTR-1 & GSTR-3B Tax Filing Summaries' },
                          { key: 'AuditTrail', label: 'Audit Trail & Edit Logs' },
                        ].map(r => (
                          <label 
                            key={r.key}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 8, 
                              padding: '10px 12px', 
                              background: formPerms.reports[r.key as keyof UserPermissions['reports']] ? '#f0fdf4' : '#f8fafc',
                              border: `1px solid ${formPerms.reports[r.key as keyof UserPermissions['reports']] ? '#86efac' : '#e2e8f0'}`,
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            <input 
                              type="checkbox"
                              checked={!!formPerms.reports[r.key as keyof UserPermissions['reports']]}
                              onChange={() => toggleReportPerm(r.key as any)}
                              style={{ width: 16, height: 16 }}
                            />
                            {r.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Registers & Daybook */}
                  {activeTab === 'registers' && (
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                        {[
                          { key: 'Day Book', label: 'Day Book (View Daily Chronological Transactions)' },
                          { key: 'Sales Register', label: 'Sales Register' },
                          { key: 'Purchase Register', label: 'Purchase Register' },
                          { key: 'Payment Register', label: 'Payment Register' },
                          { key: 'Receipt Register', label: 'Receipt Register' },
                          { key: 'Journal Register', label: 'Journal Register' },
                          { key: 'Contra Register', label: 'Contra Register' },
                          { key: 'Debit Note Register', label: 'Debit Note Register' },
                          { key: 'Credit Note Register', label: 'Credit Note Register' },
                          { key: 'Quotation Register', label: 'Sales Quotation Register' },
                        ].map(reg => (
                          <label 
                            key={reg.key}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 8, 
                              padding: '8px 12px', 
                              background: formPerms.registers[reg.key as keyof UserPermissions['registers']] ? '#f0fdf4' : '#f8fafc',
                              border: `1px solid ${formPerms.registers[reg.key as keyof UserPermissions['registers']] ? '#86efac' : '#e2e8f0'}`,
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            <input 
                              type="checkbox"
                              checked={!!formPerms.registers[reg.key as keyof UserPermissions['registers']]}
                              onChange={() => toggleRegisterPerm(reg.key as any)}
                              style={{ width: 16, height: 16 }}
                            />
                            {reg.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Modules (BOM & Banking) */}
                  {activeTab === 'modules' && (
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                        {[
                          { key: 'BOM', label: 'Bill of Materials (BOM Templates)' },
                          { key: 'Manufacturing', label: 'Manufacturing Journals' },
                          { key: 'BankStatement', label: 'Bank Statement Entry & Reconciliation' },
                          { key: 'PurchaseOrder', label: 'Purchase Order Module (PO Entry & Register)' },
                        ].map(m => (
                          <label 
                            key={m.key}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 8, 
                              padding: '10px 12px', 
                              background: formPerms.modules[m.key as keyof UserPermissions['modules']] ? '#f0fdf4' : '#f8fafc',
                              border: `1px solid ${formPerms.modules[m.key as keyof UserPermissions['modules']] ? '#86efac' : '#e2e8f0'}`,
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            <input 
                              type="checkbox"
                              checked={!!formPerms.modules[m.key as keyof UserPermissions['modules']]}
                              onChange={() => toggleModulePerm(m.key as any)}
                              style={{ width: 16, height: 16 }}
                            />
                            {m.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 5: Masters & Delete Controls */}
                  {activeTab === 'masters' && (
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                        {[
                          { key: 'createLedger', label: 'Allow Creating New Ledgers' },
                          { key: 'alterLedger', label: 'Allow Altering Existing Ledgers' },
                          { key: 'createStockItem', label: 'Allow Creating New Stock Items' },
                          { key: 'alterStockItem', label: 'Allow Altering Existing Stock Items' },
                          { key: 'deleteMaster', label: 'Allow Deleting Master Accounts (Alt+D)' },
                          { key: 'deleteVoucher', label: 'Allow Deleting Vouchers (Alt+D)' },
                        ].map(act => (
                          <label 
                            key={act.key}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 8, 
                              padding: '10px 12px', 
                              background: formPerms.masters[act.key as keyof UserPermissions['masters']] ? '#f0fdf4' : '#f8fafc',
                              border: `1px solid ${formPerms.masters[act.key as keyof UserPermissions['masters']] ? '#86efac' : '#e2e8f0'}`,
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            <input 
                              type="checkbox"
                              checked={!!formPerms.masters[act.key as keyof UserPermissions['masters']]}
                              onChange={() => toggleMasterPerm(act.key as any)}
                              style={{ width: 16, height: 16 }}
                            />
                            {act.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 4, padding: '8px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 24px', fontWeight: 'bold', fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 4px rgba(16,185,129,0.3)' }}
                >
                  ✓ Save User & Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

