"use client";

const TOKEN_KEY = "tally_auth_token";
const USER_KEY = "tally_auth_user";

export const authClient = {
  setSession: (token: string, user: any, offlineToken?: string | null) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        if (offlineToken) {
          localStorage.setItem('ledgerx_offline_license_token', offlineToken);
          if ((window as any).desktopBridge?.saveOfflineToken) {
            (window as any).desktopBridge.saveOfflineToken(offlineToken);
          }
        }
      } catch {}
      try {
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {}
    }
  },

  getToken: () => {
    if (typeof window !== "undefined") {
      const t = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
      if (t && t !== 'offline_license_session') return t;
      const off = localStorage.getItem('ledgerx_offline_license_token') || localStorage.getItem('ledgerx_license_vault');
      if (off) return off;
      return t;
    }
    return null;
  },

  getUser: () => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  logout: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch {}
      try {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
      } catch {}
    }
  },

  isAuthenticated: () => {
    if (typeof window !== "undefined") {
      return !!(localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY));
    }
    return false;
  }
};
