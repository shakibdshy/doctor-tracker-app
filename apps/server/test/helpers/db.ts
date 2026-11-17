import { Patient } from "@doctor-tracker-app/db/models/patient.model";
import { Doctor } from "@doctor-tracker-app/db/models/doctor.model";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Seam-1 test fixture (spec, Testing Decisions): the service layer runs
 * against a real isolated MongoDB — no HTTP, no mocks.
 */
export type TestDb = {
  teardown: () => Promise<void>;
};

export async function createTestDb(): Promise<TestDb> {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri("doctor-tracker-test");
  await mongoose.connect(uri);
  // Ensure the (unique) indexes exist before any write.
  await Doctor.init();
  await Patient.init();

  return {
    async teardown() {
      await mongoose.disconnect();
      await mongod.stop();
    },
  };
}
