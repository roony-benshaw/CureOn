import axios from "axios";



// Create an axios instance with default config
const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/auth",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to inject the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          const response = await axios.post(
            "http://127.0.0.1:8000/api/auth/token/refresh/",
            { refresh: refreshToken }
          );

          const { access } = response.data;

          localStorage.setItem("access_token", access);

          originalRequest.headers["Authorization"] = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed", refreshError);

          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");

          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);



export const authService = {
  login: async (username, password) => {
    const response = await api.post("/login/", { username, password });

    if (response.data.access) {
      localStorage.setItem("access_token", response.data.access);
      localStorage.setItem("refresh_token", response.data.refresh);
    }

    return response.data;
  },

  register: async (userData) => {
    const response = await api.post("/register/", userData);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  getCurrentUser: async () => {
    const response = await api.get("/me/");
    return response.data;
  },
};



export const userService = {
  list: async (role) => {
    const response = await api.get("/users/", {
      params: role ? { role } : undefined,
    });
    return response.data;
  },

  listLabs: async () => {
    const response = await api.get("/labs/");
    return response.data;
  },

  listDoctors: async (specialization) => {
    const response = await api.get("/doctors/", {
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
  },
};

/* ===========================
   APPOINTMENTS API INSTANCE
=========================== */

const appointmentsApi = axios.create({
  baseURL: "http://127.0.0.1:8000/api/appointments",
  headers: {
    "Content-Type": "application/json",
  },
});

appointmentsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
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

      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          const response = await axios.post(
            "http://127.0.0.1:8000/api/auth/token/refresh/",
            { refresh: refreshToken }
          );

          const { access } = response.data;
          localStorage.setItem("access_token", access);

          originalRequest.headers["Authorization"] = `Bearer ${access}`;
          return appointmentsApi(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed", refreshError);

          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");

          window.location.href = "/login";
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
    const response = await appointmentsApi.get("/available-slots/", {
      params: { doctor_id: doctorId, date },
    });
    return response.data;
  },

  book: async ({ doctor_id, date, time_slot, visit_type }) => {
    const response = await appointmentsApi.post("/book/", {
      doctor_id,
      date,
      time_slot,
      visit_type,
    });
    return response.data;
  },

  myAppointments: async (status) => {
    const response = await appointmentsApi.get("/mine/", {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  cancel: async (appointmentId) => {
    const response = await appointmentsApi.post(`/${appointmentId}/cancel/`);
    return response.data;
  },

  requestReschedule: async (
    appointmentId,
    requested_date,
    requested_time_slot
  ) => {
    const response = await appointmentsApi.post(
      `/${appointmentId}/reschedule-request/`,
      {
        requested_date,
        requested_time_slot,
      }
    );
    return response.data;
  },

  // Doctor
  doctorAvailability: {
    list: async () => {
      const response = await appointmentsApi.get("/availability/");
      return response.data;
    },

    add: async ({ weekday, start_time, end_time }) => {
      const response = await appointmentsApi.post("/availability/", {
        weekday,
        start_time,
        end_time,
      });
      return response.data;
    },

    remove: async ({ weekday, start_time, end_time }) => {
      const response = await appointmentsApi.delete("/availability/", {
        data: { weekday, start_time, end_time },
      });
      return response.status === 204;
    },
  },

  doctorAppointments: async (status) => {
    const response = await appointmentsApi.get("/doctor/", {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  doctorUpdateStatus: async (appointmentId, status) => {
    const response = await appointmentsApi.post(`/${appointmentId}/status/`, {
      status,
    });
    return response.data;
  },

  doctorRescheduleDecision: async (appointmentId, decision) => {
    const response = await appointmentsApi.post(
      `/doctor/${appointmentId}/reschedule-decision/`,
      { decision }
    );
    return response.data;
  },

  doctorReschedule: async (appointmentId, date, time_slot) => {
    const response = await appointmentsApi.post(
      `/doctor/${appointmentId}/reschedule/`,
      { date, time_slot }
    );
    return response.data;
  },

  doctorPatients: async () => {
    const response = await appointmentsApi.get("/doctor/patients/");
    return response.data;
  },

  doctorPatientHistory: async (patientId) => {
    const response = await appointmentsApi.get(`/doctor/patients/${patientId}/history/`);
    return response.data;
  },

  // Admin
  adminAll: async () => {
    const response = await appointmentsApi.get("/admin/all/");
    return response.data;
  },

  adminRescheduleDecision: async (appointmentId, decision) => {
    const response = await appointmentsApi.post(
      `/${appointmentId}/reschedule-decision/`,
      { decision }
    );
    return response.data;
  },

  prescriptions: {
    create: async (appointmentId, { diagnosis, items, notes }) => {
      const response = await appointmentsApi.post(
        `/${appointmentId}/prescription/`,
        {
          diagnosis,
          notes,
          items,
        }
      );
      return response.data;
    },

    listPatient: async () => {
      const response = await appointmentsApi.get("/patient/prescriptions/");
      return response.data;
    },

    listPharmacy: async () => {
      const response = await appointmentsApi.get("/pharmacy/prescriptions/");
      return response.data;
    },

    updatePharmacyStatus: async (prescriptionId, status) => {
      const response = await appointmentsApi.post(
        `/pharmacy/prescriptions/${prescriptionId}/status/`,
        { status }
      );
      return response.data;
    },

    updatePharmacyBill: async (prescriptionId, items, attachment) => {
      if (attachment) {
        const form = new FormData();
        form.append("items", JSON.stringify(items));
        form.append("attachment", attachment);

        const response = await appointmentsApi.post(
          `/pharmacy/prescriptions/${prescriptionId}/bill/`,
          form,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        return response.data;
      }

      const response = await appointmentsApi.post(
        `/pharmacy/prescriptions/${prescriptionId}/bill/`,
        { items }
      );
      return response.data;
    },
  },

  lab: {
    create: async (appointmentId, { tests, notes, priority, lab_id }) => {
      const response = await appointmentsApi.post(
        `/${appointmentId}/lab-request/`,
        {
          tests,
          notes,
          priority,
          lab_id,
        }
      );
      return response.data;
    },

    listRequests: async () => {
      const response = await appointmentsApi.get("/lab/requests/");
      return response.data;
    },

    updateStatus: async (requestId, status) => {
      const response = await appointmentsApi.post(
        `/lab/requests/${requestId}/status/`,
        { status }
      );
      return response.data;
    },

    patientResults: async () => {
      const response = await appointmentsApi.get("/patient/lab-results/");
      return response.data;
    },


    submitResult: async (
      requestId,
      { result_value, reference_range, clinical_notes, attachment }
    ) => {
      const form = new FormData();

      form.append("result_value", result_value || "");
      form.append("reference_range", reference_range || "");
      form.append("clinical_notes", clinical_notes || "");

      if (attachment) {
        form.append("attachment", attachment);
      }

      const response = await appointmentsApi.post(
        `/lab/requests/${requestId}/result/`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      return response.data;
    },
  },

  adminCancel: async (appointmentId) => {
    const response = await appointmentsApi.post(
      `/${appointmentId}/admin-cancel/`
    );
    return response.data;
  },
};



export const adminService = {
  getDoctorDetail: async (id) => {
    const response = await api.get(`/admin/doctors/${id}/`);
    return response.data;
  },
  getPatientDetail: async (id) => {
    const response = await api.get(`/admin/patients/${id}/`);
    return response.data;
  },
  getPharmacyDetail: async (id) => {
    const response = await api.get(`/admin/pharmacy/${id}/`);
    return response.data;
  },
  getLabDetail: async (id) => {
    const response = await api.get(`/admin/labs/${id}/`);
    return response.data;
  }
};

export const profileService = {
  patient: {
    get: async () => {
      const response = await api.get("/patient/profile/");
      return response.data;
    },
    update: async (payload) => {
      const response = await api.patch("/patient/profile/", payload);
      return response.data;
    },
  },
  doctor: {
    get: async () => {
      const response = await api.get("/doctor/profile/");
      return response.data;
    },
    update: async (payload) => {
      const response = await api.patch("/doctor/profile/", payload);
      return response.data;
    },
  },
  pharmacy: {
    get: async () => {
      const response = await api.get("/pharmacy/profile/");
      return response.data;
    },
    update: async (payload) => {
      const response = await api.patch("/pharmacy/profile/", payload);
      return response.data;
    },
  },
  labs: {
    get: async () => {
      const response = await api.get("/labs/profile/");
      return response.data;
    },
    update: async (payload) => {
      const response = await api.patch("/labs/profile/", payload);
      return response.data;
    },
  },
  admin: {
    get: async () => {
      const response = await api.get("/admin/profile/");
      return response.data;
    },
    update: async (payload) => {
      const response = await api.patch("/admin/profile/", payload);
      return response.data;
    },
  },
};

export default api;
