import express from "express";
import {
  useDBRoute,
  mockCreateServiceAppointment,
  mockGetServiceAppointments,
  mockCancelServiceAppointment,
  mockUpdateServiceAppointment,
  mockGetStatsSummary,
} from "../utils/mockStore.js";
import {
  createServiceAppointment,
  getServiceAppointments,
  updateServiceAppointment,
  cancelServiceAppointment,
  getStatsSummary,
} from "../controllers/serviceAppointmentController.js";

const router = express.Router();

router.post("/", useDBRoute(createServiceAppointment, mockCreateServiceAppointment));
router.get("/", useDBRoute(getServiceAppointments, mockGetServiceAppointments));
router.get("/me", useDBRoute(getServiceAppointments, mockGetServiceAppointments));
router.get("/stats/summary", useDBRoute(getStatsSummary, mockGetStatsSummary));
router.put("/:id", useDBRoute(updateServiceAppointment, mockUpdateServiceAppointment));
router.patch("/:id", useDBRoute(updateServiceAppointment, mockUpdateServiceAppointment));
router.patch("/:id/cancel", useDBRoute(cancelServiceAppointment, mockCancelServiceAppointment));

export default router;
