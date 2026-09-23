import express from "express";
import {
  useDBRoute,
  mockRegisterPatient,
  mockVerifyPatientOTP,
  mockLoginPatient,
  mockGetPatientCount,
} from "../utils/mockStore.js";
import {
  registerPatient,
  verifyPatientOTP,
  resendPatientOTP,
  loginPatient,
  getPatientCount,
} from "../controllers/patientController.js";

const router = express.Router();

router.post("/register", useDBRoute(registerPatient, mockRegisterPatient));
router.post("/verify-otp", useDBRoute(verifyPatientOTP, mockVerifyPatientOTP));
router.post("/resend-otp", useDBRoute(resendPatientOTP, mockRegisterPatient));
router.post("/login", useDBRoute(loginPatient, mockLoginPatient));
router.get("/count", useDBRoute(getPatientCount, mockGetPatientCount));

export default router;
