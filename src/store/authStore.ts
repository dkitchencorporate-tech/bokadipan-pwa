import { create } from 'zustand';
import { api, setToken, getToken } from '../lib/apiClient';

type ViewType = 'login' | 'register' | 'profile' | 'edit-profile' | 'orders' | 'legal' | 'legal-doc' | 'delete-account' | 'delete-success' | 'forgot-password' | 'check-email';

// `user` ya no es el objeto de sesión de Supabase Auth — es un resumen
// mínimo derivado del propio `profile` (id + email), suficiente para todo
// el código que solo comprobaba `user?.id` / `!!user` / `user?.email`.
interface AuthUser {
  id: string;
  email?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  profile: any | null;
  orders: any[];
  isUserModalOpen: boolean;
  userModalView: ViewType;
  activeLegalDoc: string;
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: any | null) => void;
  openUserModal: (view?: ViewType) => void;
  closeUserModal: () => void;
  setModalView: (view: ViewType) => void;
  setLegalDoc: (doc: string) => void;
  logout: () => void;
  init: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<any>;
  verify2FA: (email: string, code: string) => Promise<any>;
  register: (data: { full_name: string; phone: string; email?: string; password: string; address?: any }) => Promise<void>;
  updateProfile: (data: { full_name?: string; phone?: string; email?: string; address?: any }) => Promise<void>;
  fetchOrders: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  orders: [],
  isUserModalOpen: false,
  userModalView: 'login',
  activeLegalDoc: '',

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  openUserModal: (view) => set({ isUserModalOpen: true, userModalView: view || (get().user ? 'profile' : 'login') }),
  closeUserModal: () => set({ isUserModalOpen: false }),
  setModalView: (view) => set({ userModalView: view }),
  setLegalDoc: (doc) => set({ activeLegalDoc: doc, userModalView: 'legal-doc' }),

  logout: () => {
    setToken(null);
    set({ user: null, profile: null, orders: [], isUserModalOpen: false });
    import('./cartStore').then(({ useCartStore }) => useCartStore.getState().clearCart());
  },

  // Se llama una vez al arrancar la app (ver App.tsx): si hay un JWT
  // guardado, intenta recuperar la sesión pidiendo el perfil al backend.
  init: async () => {
    if (!getToken()) return;
    await get().fetchProfile();
  },

  signIn: async (identifier: string, password: string) => {
    const res = await api.post('/login', { identifier, password });
    if (res && res.requires_2fa) {
      return res;
    }
    setToken(res.token);
    set({ user: { id: res.profile.id, email: res.profile.email }, profile: res.profile });
    await get().fetchOrders();
    return res;
  },

  verify2FA: async (email: string, code: string) => {
    const res = await api.post('/account/verify-2fa', { email, code });
    setToken(res.token);
    set({ user: { id: res.profile.id, email: res.profile.email }, profile: res.profile });
    await get().fetchOrders();
    return res;
  },

  register: async (data) => {
    const { token, profile } = await api.post('/register', data);
    setToken(token);
    set({ user: { id: profile.id, email: profile.email }, profile, orders: [] });
  },

  fetchProfile: async () => {
    if (!getToken()) return;
    try {
      const { profile, orders } = await api.get('/profile');
      set({ user: { id: profile.id, email: profile.email }, profile, orders });
    } catch (e) {
      // JWT inválido o caducado — cerramos sesión localmente sin más drama
      setToken(null);
      set({ user: null, profile: null, orders: [] });
    }
  },

  updateProfile: async (updates) => {
    const { profile } = await api.put('/profile', updates);
    set({ profile });
  },

  fetchOrders: async () => {
    if (!getToken()) return;
    try {
      const { orders } = await api.get('/profile');
      set({ orders });
    } catch {
      /* noop */
    }
  },

  deleteAccount: async () => {
    await api.post('/delete-account');
    get().logout();
  }
}));
