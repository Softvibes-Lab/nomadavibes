import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                process.env.EXPO_PUBLIC_BACKEND_URL || 
                'https://quickjobs-18.preview.emergentagent.com';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role?: string;
  onboarding_completed: boolean;
}

interface Profile {
  user_id: string;
  role: string;
  name: string;
  age?: number;
  bio?: string;
  photo?: string;
  skills: string[];
  location?: { lat: number; lng: number };
  address?: string;
  business_name?: string;
  business_photos?: string[];
  prestige_score?: number;
  badges?: string[];
  completed_jobs?: number;
  rating?: number;
  rating_count?: number;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSessionToken: (token: string | null) => void;
  login: (sessionId: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  sessionToken: null,
  isLoading: true,
  isAuthenticated: false,
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) => set({ profile }),
  setSessionToken: (token) => set({ sessionToken: token }),
  
  login: async (sessionId: string) => {
    try {
      set({ isLoading: true });
      
      const response = await axios.post(`${API_URL}/api/auth/session`, {
        session_id: sessionId
      });
      
      const { user, session_token } = response.data;
      
      // Store session token
      await AsyncStorage.setItem('session_token', session_token);
      
      set({
        user,
        sessionToken: session_token,
        isAuthenticated: true,
        isLoading: false
      });
      
      // Fetch profile if exists
      await get().refreshProfile();
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false });
      return false;
    }
  },
  
  logout: async () => {
    try {
      const token = get().sessionToken;
      if (token) {
        await axios.post(`${API_URL}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('session_token');
      set({
        user: null,
        profile: null,
        sessionToken: null,
        isAuthenticated: false
      });
    }
  },
  
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      
      const token = await AsyncStorage.getItem('session_token');
      if (!token) {
        set({ isLoading: false });
        return false;
      }
      
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { user, profile } = response.data;
      
      set({
        user,
        profile,
        sessionToken: token,
        isAuthenticated: true,
        isLoading: false
      });
      
      return true;
    } catch (error) {
      console.error('Check auth error:', error);
      await AsyncStorage.removeItem('session_token');
      set({
        user: null,
        profile: null,
        sessionToken: null,
        isAuthenticated: false,
        isLoading: false
      });
      return false;
    }
  },
  
  refreshProfile: async () => {
    try {
      const token = get().sessionToken;
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { user, profile } = response.data;
      set({ user, profile });
    } catch (error) {
      console.error('Refresh profile error:', error);
    }
  }
}));
