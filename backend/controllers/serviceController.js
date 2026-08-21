import Service from "../models/Service.js";

// List services
export const getServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 });
    return res.json({ success: true, data: services, services });
  } catch (err) {
    console.error("getServices error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get service by ID
export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    return res.json({ success: true, data: service, service });
  } catch (err) {
    console.error("getServiceById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create service
export const createService = async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.name) {
      return res.status(400).json({ success: false, message: "Service name is required" });
    }

    let slots = {};
    if (body.slots) {
      try {
        slots = typeof body.slots === "string" ? JSON.parse(body.slots) : body.slots;
      } catch (err) {
        slots = {};
      }
    }

    const service = new Service({
      name: body.name,
      about: body.about || "",
      shortDescription: body.shortDescription || "",
      price: body.price !== undefined ? Number(body.price) : 0,
      available: body.available !== undefined ? body.available : true,
      imageUrl: body.imageUrl || null,
      imagePublicId: body.imagePublicId || null,
      dates: body.dates || [],
      slots: slots,
      instructions: body.instructions || [],
    });

    await service.save();
    return res.status(201).json({ success: true, data: service, service });
  } catch (err) {
    console.error("createService error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update service
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    if (body.name !== undefined) service.name = body.name;
    if (body.about !== undefined) service.about = body.about;
    if (body.shortDescription !== undefined) service.shortDescription = body.shortDescription;
    if (body.price !== undefined) service.price = Number(body.price);
    if (body.available !== undefined) service.available = body.available;
    if (body.imageUrl !== undefined) service.imageUrl = body.imageUrl;
    if (body.imagePublicId !== undefined) service.imagePublicId = body.imagePublicId;
    if (body.dates !== undefined) service.dates = body.dates;
    
    if (body.slots !== undefined) {
      try {
        service.slots = typeof body.slots === "string" ? JSON.parse(body.slots) : body.slots;
      } catch (err) {
        // keep old
      }
    }

    if (body.instructions !== undefined) service.instructions = body.instructions;

    await service.save();
    return res.json({ success: true, data: service, service });
  } catch (err) {
    console.error("updateService error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete service
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findByIdAndDelete(id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    return res.json({ success: true, message: "Service deleted successfully" });
  } catch (err) {
    console.error("deleteService error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};