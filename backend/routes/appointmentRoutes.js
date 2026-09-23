import express from "express";
import {
  useDBRoute,
  mockCreateAppointment,
  mockGetAppointments,
  mockCancelAppointment,
  mockUpdateAppointment,
  mockGetStats,
  mockGetAppointmentsByDoctor,
  mockGetAdminAnalytics,
  mockGetDoctorAnalytics,
} from "../utils/mockStore.js";
import {
  createAppointment,
  getAppointments,
  confirmPayment,
  updateAppointment,
  cancelAppointment,
  getStats,
  getAppointmentsByDoctor,
  getAdminAnalytics,
  getDoctorAnalytics,
} from "../controllers/appointmentController.js";

const router = express.Router();

router.get("/analytics/admin", useDBRoute(getAdminAnalytics, mockGetAdminAnalytics));
router.get("/analytics/doctor/:id", useDBRoute(getDoctorAnalytics, mockGetDoctorAnalytics));
router.post("/", useDBRoute(createAppointment, mockCreateAppointment));
router.get("/", useDBRoute(getAppointments, mockGetAppointments));
router.get("/me", useDBRoute(getAppointments, mockGetAppointments));
router.get("/confirm", useDBRoute(confirmPayment, confirmPayment));
router.get("/stats", useDBRoute(getStats, mockGetStats));
router.get("/doctor/:id", useDBRoute(getAppointmentsByDoctor, mockGetAppointmentsByDoctor));
router.put("/:id", useDBRoute(updateAppointment, mockUpdateAppointment));
router.patch("/:id", useDBRoute(updateAppointment, mockUpdateAppointment));
router.patch("/:id/cancel", useDBRoute(cancelAppointment, mockCancelAppointment));

export default router;
