import express from "express";
import { upload } from "../middleware/uploadMiddleware.js";
import {
  useDBRoute,
  mockGetDoctors,
  mockGetDoctorById,
  mockCreateDoctor,
  mockLoginDoctor,
  mockClerkDoctorAuth,
  mockClerkDoctorLink,
  mockClerkDoctorRegister,
  mockUpdateDoctor,
  mockDeleteDoctor,
  mockUpdateDoctorApproval,
} from "../utils/mockStore.js";
import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  loginDoctor,
  clerkDoctorAuth,
  clerkDoctorLink,
  clerkDoctorRegister,
  updateDoctorApproval,
} from "../controllers/doctorController.js";

const router = express.Router();

router.get("/", useDBRoute(getDoctors, mockGetDoctors));
router.get("/:id", useDBRoute(getDoctorById, mockGetDoctorById));
router.post("/", upload.single("image"), useDBRoute(createDoctor, mockCreateDoctor));
router.post("/login", useDBRoute(loginDoctor, mockLoginDoctor));
router.post("/clerk-auth", useDBRoute(clerkDoctorAuth, mockClerkDoctorAuth));
router.post("/clerk-link", useDBRoute(clerkDoctorLink, mockClerkDoctorLink));
router.post("/clerk-register", useDBRoute(clerkDoctorRegister, mockClerkDoctorRegister));
router.patch("/:id/approval", useDBRoute(updateDoctorApproval, mockUpdateDoctorApproval));
router.put("/:id/approval", useDBRoute(updateDoctorApproval, mockUpdateDoctorApproval));
router.put("/:id", upload.single("image"), useDBRoute(updateDoctor, mockUpdateDoctor));
router.delete("/:id", useDBRoute(deleteDoctor, mockDeleteDoctor));

export default router;
