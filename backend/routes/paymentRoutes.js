import express from "express";
import {
  useDBRoute,
  mockCreateRazorpayOrder,
  mockVerifyRazorpayPayment,
} from "../utils/mockStore.js";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/razorpay/create-order", useDBRoute(createRazorpayOrder, mockCreateRazorpayOrder));
router.post("/razorpay/verify", useDBRoute(verifyRazorpayPayment, mockVerifyRazorpayPayment));

export default router;
