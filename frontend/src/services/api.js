import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/auth',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to inject the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh (optional but recommended)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          const response = await axios.post('http://127.0.0.1:8000/api/auth/token/refresh/', {
            refresh: refreshToken,
          });
          
          const { access } = response.data;
          
          localStorage.setItem('access_token', access);
          
          // Retry the original request with new token
          originalRequest.headers['Authorization'] = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh fails, redirect to login (or clear storage)
          console.error("Token refresh failed", refreshError);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/login/', { username, password });
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
    }
    return response.data;
  },
  
  register: async (userData) => {
    const response = await api.post('/register/', userData);
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/me/');
    return response.data;
  }
};

export const userService = {
  list: async (role) => {
    const response = await api.get('/users/', {
      params: role ? { role } : undefined,
    });
    return response.data;
  },
  listDoctors: async (specialization) => {
    const response = await api.get('/doctors/', {
      params: specialization ? { specialization } : undefined,
    });
    return response.data;
  },
  update: async (id, payload) => {
    const response = await api.patch(`/users/${id}/`, payload);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/users/${id}/`);
    return response.status === 204;
  }
};

// Appointments API instance
const appointmentsApi = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/appointments',
  headers: {
    'Content-Type': 'application/json',
  },
});

appointmentsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

appointmentsApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post('http://127.0.0.1:8000/api/auth/token/refresh/', {
            refresh: refreshToken,
          });
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          originalRequest.headers['Authorization'] = `Bearer ${access}`;
          return appointmentsApi(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed", refreshError);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export const appointmentsService = {
  // General / Patient
  getAvailableSlots: async (doctorId, date) => {
    const response = await appointmentsApi.get('/available-slots/', {
      params: { doctor_id: doctorId, date },
    });
    return response.data;
  },
  book: async ({ doctor_id, date, time_slot, visit_type }) => {
    const response = await appointmentsApi.post('/book/', { doctor_id, date, time_slot, visit_type });
    return response.data;
  },
  myAppointments: async (status) => {
    const response = await appointmentsApi.get('/mine/', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },
  cancel: async (appointmentId) => {
    const response = await appointmentsApi.post(`/${appointmentId}/cancel/`);
    return response.data;
  },
  requestReschedule: async (appointmentId, requested_date, requested_time_slot) => {
    const response = await appointmentsApi.post(`/${appointmentId}/reschedule-request/`, {
      requested_date,
      requested_time_slot,
    });
    return response.data;
  },

  // Doctor
  doctorAvailability: {
    list: async () => {
      const response = await appointmentsApi.get('/availability/');
      return response.data;
    },
    add: async ({ weekday, start_time, end_time }) => {
      const response = await appointmentsApi.post('/availability/', { weekday, start_time, end_time });
      return response.data;
    },
    remove: async ({ weekday, start_time, end_time }) => {
      const response = await appointmentsApi.delete('/availability/', {
        data: { weekday, start_time, end_time },
      });
      return response.status === 204;
    },
  },
  doctorAppointments: async (status) => {
    const response = await appointmentsApi.get('/doctor/', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },
  doctorUpdateStatus: async (appointmentId, status) => {
    const response = await appointmentsApi.post(`/${appointmentId}/status/`, { status });
    return response.data;
  },

  // Admin
  adminAll: async () => {
    const response = await appointmentsApi.get('/admin/all/');
    return response.data;
  },
  adminRescheduleDecision: async (appointmentId, decision) => {
    const response = await appointmentsApi.post(`/${appointmentId}/reschedule-decision/`, { decision });
    return response.data;
  },
  adminCancel: async (appointmentId) => {
    const response = await appointmentsApi.post(`/${appointmentId}/admin-cancel/`);
    return response.data;
  },
};

export default api;
