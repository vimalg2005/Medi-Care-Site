import express from "express";
import { upload } from "../middleware/uploadMiddleware.js";
import {
  useDBRoute,
  mockGetServices,
  mockGetServiceById,
  mockCreateService,
  mockUpdateService,
  mockDeleteService,
} from "../utils/mockStore.js";
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";

const router = express.Router();

router.get("/", useDBRoute(getServices, mockGetServices));
router.get("/:id", useDBRoute(getServiceById, mockGetServiceById));
router.post("/", upload.single("image"), useDBRoute(createService, mockCreateService));
router.put("/:id", upload.single("image"), useDBRoute(updateService, mockUpdateService));
router.delete("/:id", useDBRoute(deleteService, mockDeleteService));

export default router;
