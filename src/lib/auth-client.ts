"use client";

const TOKEN_KEY = "tally_auth_token";
const USER_KEY = "tally_auth_user";

export const authClient = {
  setSession: (token: string, user: any) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  getToken: () => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(TOKEN_KEY);
    }
    return null;
  },

  getUser: () => {
    if (typeof window !== "undefined") {
      const user = sessionStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  logout: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
  },

  isAuthenticated: () => {
    if (typeof window !== "undefined") {
      return !!sessionStorage.getItem(TOKEN_KEY);
    }
    return false;
  }
};
