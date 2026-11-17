import mongoose from "mongoose";

import { SPECIALIZATIONS } from "../schemas/enums";

const { Schema, model } = mongoose;

/**
 * Lowercase shadow fields (nameLower, emailLower, hospitalLower) are kept in
 * sync by the service layer on every create/update (ADR-0001) and back the
 * anchored prefix search. Compound indexes follow equality → sort → range:
 * filters first, newest-first sort second.
 */
const doctorSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 120 },
    nameLower: { type: String, required: true },
    specialization: { type: String, required: true, enum: SPECIALIZATIONS },
    hospital: { type: String, required: true, maxlength: 120 },
    hospitalLower: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    emailLower: { type: String, required: true },
  },
  { collection: "doctors", timestamps: true },
);

doctorSchema.index({ specialization: 1, createdAt: -1 });
doctorSchema.index({ hospitalLower: 1, createdAt: -1 });
doctorSchema.index({ nameLower: 1, createdAt: -1 });
doctorSchema.index({ emailLower: 1, createdAt: -1 });
doctorSchema.index({ createdAt: -1 });
// Duplicate protection at the storage level: one doctor per normalized email.
doctorSchema.index({ emailLower: 1 }, { unique: true });

const Doctor = model<DoctorDocument>("Doctor", doctorSchema);

export interface DoctorDocument extends mongoose.Document {
  name: string;
  nameLower: string;
  specialization: (typeof SPECIALIZATIONS)[number];
  hospital: string;
  hospitalLower: string;
  phone: string;
  email: string;
  emailLower: string;
  createdAt: Date;
  updatedAt: Date;
}

export { Doctor };
