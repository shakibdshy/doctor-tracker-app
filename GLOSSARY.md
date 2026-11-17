# Doctor Tracker

An administrative portal where authenticated users manage doctors and the patients under their care.

## Language

**Doctor**:
A medical professional registered in the portal, defined by a specialization and a hospital, who carries a list of assigned patients.
_Avoid_: Physician, provider, practitioner

**Patient**:
A person receiving care, tracked in the portal. A patient is assigned to at most one doctor at a time and may be unassigned.
_Avoid_: Client, case

**Assignment**:
The link between a patient and the doctor responsible for their care. A doctor has many patients; a patient has at most one doctor.
_Avoid_: Ownership, booking

**Unassign**:
To remove a patient's assignment to a doctor. The patient record remains in the portal and appears in the unassigned pool.
_Avoid_: Remove from list, detach, discharge

**Delete**:
To permanently remove a patient record from the portal. Distinct from Unassign, which preserves the record.
_Avoid_: Remove (ambiguous between Unassign and Delete)

**Condition**:
The primary medical condition a patient is being treated for, drawn from a fixed portal-wide list.
_Avoid_: Diagnosis, disease, illness

**Specialization**:
A doctor's field of medical expertise, drawn from a fixed portal-wide list.
_Avoid_: Department, specialty, discipline

**Admin**:
The portal role with full access: doctor management, patient management, and user provisioning.
_Avoid_: Superuser, owner

**Staff**:
The portal role for day-to-day patient care records: viewing everything, creating and editing patients, and managing assignments. Deleting patients, managing doctors, and provisioning users are Admin-only.
_Avoid_: Editor, viewer, employee