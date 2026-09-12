import mongoose from "mongoose";

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Subscriber = mongoose.models.Subscriber || mongoose.model("Subscriber", subscriberSchema);
export default Subscriber;
