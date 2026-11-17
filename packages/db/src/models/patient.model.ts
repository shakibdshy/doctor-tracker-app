import mongoose from "mongoose";

import { CONDITIONS, GENDERS } from "../schemas/enums";

const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

/**
 * Assignment is at most one doctor (GLOSSARY.md): an optional reference,
 * never an embedded array on the doctor. Shadow fields (nameLower,
 * phoneLower) sync in the service layer (ADR-0001).
 */
const patientSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 120 },
    nameLower: { type: String, required: true },
    phone: { type: String, required: true },
    phoneLower: { type: String, required: true },
    gender: { type: String, required: true, enum: GENDERS },
    dateOfBirth: { type: Date, required: true },
    condition: { type: String, required: true, enum: CONDITIONS },
    doctor: { type: ObjectId, ref: "Doctor" },
    notes: { type: String, maxlength: 2000 },
  },
  { collection: "patients", timestamps: true },
);

patientSchema.index({ doctor: 1, createdAt: -1 });
patientSchema.index({ condition: 1, createdAt: -1 });
patientSchema.index({ nameLower: 1, createdAt: -1 });
patientSchema.index({ phoneLower: 1, createdAt: -1 });
patientSchema.index({ createdAt: -1 });

const Patient = model<PatientDocument>("Patient", patientSchema);

export interface PatientDocument extends mongoose.Document {
  name: string;
  nameLower: string;
  phone: string;
  phoneLower: string;
  gender: (typeof GENDERS)[number];
  dateOfBirth: Date;
  condition: (typeof CONDITIONS)[number];
  doctor: mongoose.Types.ObjectId | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export { Patient };
