import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                process.env.EXPO_PUBLIC_BACKEND_URL || 
                'https://quickjobs-18.preview.emergentagent.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - could trigger logout
      console.log('Unauthorized request');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  exchangeSession: (sessionId: string) => 
    api.post('/auth/session', { session_id: sessionId }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// User APIs
export const userAPI = {
  setRole: (role: string) => api.post('/user/set-role', { role }),
  completeWorkerOnboarding: (data: any) => api.post('/onboarding/worker', data),
  completeBusinessOnboarding: (data: any) => api.post('/onboarding/business', data),
  getProfile: () => api.get('/profile'),
  getUserProfile: (userId: string) => api.get(`/profile/${userId}`),
};

// AI APIs
export const aiAPI = {
  improveDescription: (description: string, context: string = 'profile') =>
    api.post('/ai/improve-description', { description, context }),
};

// Job APIs
export const jobAPI = {
  createJob: (data: any) => api.post('/jobs', data),
  getJobs: (params?: any) => api.get('/jobs', { params }),
  getJob: (jobId: string) => api.get(`/jobs/${jobId}`),
  applyToJob: (jobId: string, message?: string) => 
    api.post(`/jobs/${jobId}/apply`, { message }),
  getJobApplications: (jobId: string) => api.get(`/jobs/${jobId}/applications`),
  acceptApplication: (jobId: string, applicationId: string) =>
    api.post(`/jobs/${jobId}/accept/${applicationId}`),
  completeJob: (jobId: string) => api.post(`/jobs/${jobId}/complete`),
  getMyJobs: () => api.get('/my-jobs'),
};

// Review APIs
export const reviewAPI = {
  createReview: (jobId: string, rating: number, comment?: string) =>
    api.post(`/jobs/${jobId}/review`, { rating, comment }),
  getUserReviews: (userId: string) => api.get(`/reviews/${userId}`),
};

// Chat APIs
export const chatAPI = {
  getChatRooms: () => api.get('/chats'),
  getMessages: (roomId: string) => api.get(`/chats/${roomId}/messages`),
  sendMessage: (roomId: string, content: string) =>
    api.post(`/chats/${roomId}/messages`, { content }),
};

// Utility APIs
export const utilAPI = {
  getCategories: () => api.get('/categories'),
  getSkills: () => api.get('/skills'),
};

export default api;
