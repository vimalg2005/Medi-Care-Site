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
const months = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
};

function normalizeSlotsInput(rawSlots) {
  if (!rawSlots) return {};
  let parsed = rawSlots;
  if (typeof rawSlots === "string") {
    try {
      parsed = JSON.parse(rawSlots);
    } catch {
      return {};
    }
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed;
  }

  const out = {};
  if (Array.isArray(parsed)) {
    parsed.forEach((slotStr) => {
      if (!slotStr || typeof slotStr !== "string") return;
      const matchCustom = slotStr.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s*•\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      if (matchCustom) {
        const day = matchCustom[1].padStart(2, "0");
        const monthKey = matchCustom[2].toLowerCase();
        const mm = months[monthKey] || "01";
        const yyyy = matchCustom[3];
        const time = matchCustom[4].trim();
        const dateKey = `${yyyy}-${mm}-${day}`;
        if (!out[dateKey]) out[dateKey] = [];
        if (!out[dateKey].includes(time)) out[dateKey].push(time);
        return;
      }
      const matchIso = slotStr.match(/^(\d{4}-\d{2}-\d{2})(?:\s*•\s*|\s+)(.*)$/i);
      if (matchIso) {
        const dateKey = matchIso[1];
        const time = (matchIso[2] || "10:00 AM").trim();
        if (!out[dateKey]) out[dateKey] = [];
        if (!out[dateKey].includes(time)) out[dateKey].push(time);
        return;
      }
    });
  }
  return out;
}

// Create service
export const createService = async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.name) {
      return res.status(400).json({ success: false, message: "Service name is required" });
    }

    let imageUrl = body.imageUrl || null;
    let imagePublicId = body.imagePublicId || null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      imagePublicId = req.file.filename;
    }

    let instructions = [];
    if (body.instructions) {
      try {
        instructions = typeof body.instructions === "string" ? JSON.parse(body.instructions) : body.instructions;
      } catch {
        instructions = [];
      }
    }

    const slots = normalizeSlotsInput(body.slots);
    const dates = Object.keys(slots);

    const isAvailable = body.availability !== undefined 
      ? (body.availability === "available" || body.availability === "true" || body.availability === true)
      : (body.available !== undefined ? body.available : true);

    const service = new Service({
      name: body.name,
      about: body.about || "",
      shortDescription: body.shortDescription || "",
      price: body.price !== undefined ? Number(body.price) : 0,
      available: isAvailable,
      imageUrl,
      imagePublicId,
      dates,
      slots,
      instructions,
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
    
    if (body.availability !== undefined) {
      service.available = (body.availability === "available" || body.availability === "true" || body.availability === true);
    } else if (body.available !== undefined) {
      service.available = body.available;
    }

    if (req.file) {
      service.imageUrl = `/uploads/${req.file.filename}`;
      service.imagePublicId = req.file.filename;
    } else if (body.imageUrl !== undefined) {
      service.imageUrl = body.imageUrl;
    }

    if (body.imagePublicId !== undefined) service.imagePublicId = body.imagePublicId;
    
    if (body.slots !== undefined) {
      service.slots = normalizeSlotsInput(body.slots);
      service.dates = Object.keys(service.slots);
    }

    if (body.instructions !== undefined) {
      try {
        service.instructions = typeof body.instructions === "string" ? JSON.parse(body.instructions) : body.instructions;
      } catch {
        service.instructions = body.instructions;
      }
    }

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