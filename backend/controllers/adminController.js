import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecuremedicarejwtsecretkey123!";

/**
 * Strict Admin Login Controller (Password Gate)
 * Only allows login if email and password match the configured administrator credentials.
 */
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Both administrator email and password are required.",
      });
    }

    const configuredEmail = (process.env.ADMIN_EMAIL || "vimalgupta8025@gmail.com").toLowerCase().trim();
    const configuredPassword = process.env.ADMIN_PASSWORD || "Admin@12345";

    const submittedEmail = String(email).toLowerCase().trim();
    const submittedPassword = String(password);

    // Distinct validation checks for clearer feedback
    if (submittedEmail !== configuredEmail) {
      return res.status(401).json({
        success: false,
        message: `Access Denied: Email "${submittedEmail}" is not authorized. Only ${configuredEmail} is permitted.`,
      });
    }

    if (submittedPassword !== configuredPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid administrator password. Please enter the correct administrator password.",
      });
    }

    // Generate authenticated administrator token
    const token = jwt.sign(
      { role: "admin", email: configuredEmail },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Administrator authenticated successfully.",
      token,
      admin: {
        email: configuredEmail,
        role: "admin",
      },
    });
  } catch (err) {
    console.error("loginAdmin error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during administrator authentication.",
    });
  }
};

/**
 * Verify Clerk Authenticated Admin User
 * Verifies that the Clerk user email strictly matches the configured admin email.
 * If matched, issues a signed admin JWT session.
 */
export const verifyClerkAdminSession = async (req, res) => {
  try {
    const { email, clerkUserId } = req.body || {};

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required from Clerk session.",
      });
    }

    const configuredEmail = (process.env.ADMIN_EMAIL || "vimalgupta8025@gmail.com").toLowerCase().trim();
    const submittedEmail = String(email).toLowerCase().trim();

    // Strict check: Only configured admin email is permitted
    if (submittedEmail !== configuredEmail) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: Account (${submittedEmail}) is not authorized. Only ${configuredEmail} has administrator access.`,
      });
    }

    // Generate authenticated administrator token
    const token = jwt.sign(
      { role: "admin", email: configuredEmail, clerkUserId },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: `Welcome Administrator (${configuredEmail}).`,
      token,
      admin: {
        email: configuredEmail,
        role: "admin",
        clerkUserId,
      },
    });
  } catch (err) {
    console.error("verifyClerkAdminSession error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal error during Clerk admin verification.",
    });
  }
};

/**
 * Verify active admin session token
 */
export const verifyAdminSession = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.headers["x-admin-token"];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No administrator authentication token provided.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized token: Administrator role required.",
      });
    }

    return res.status(200).json({
      success: true,
      admin: {
        email: decoded.email,
        role: "admin",
      },
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: "Administrator session expired or invalid. Please log in again.",
    });
  }
};
