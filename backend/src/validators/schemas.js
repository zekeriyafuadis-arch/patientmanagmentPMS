const { z } = require('zod');
const { normalizePatientDemographics } = require('../utils/patientDemographics');

const authLoginSchema = z.object({
  email: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

const authPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

const optionalText = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((v) => (v == null ? '' : String(v).trim()));

const patientCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'name is required'),
    father_name: z.string().trim().min(1, 'father_name is required'),
    grandfather_name: z.string().trim().min(1, 'grandfather_name is required'),
    gender: z.string().trim().min(1, 'gender is required'),
    dob: optionalText,
    age: z.union([z.string(), z.number(), z.undefined(), z.null()]).transform((v) =>
      v == null || v === '' ? '' : String(v).trim()
    ),
    address: optionalText,
    region: optionalText,
    wereda_subcity: optionalText,
    ketena_gott: optionalText,
    kebele: optionalText,
    house_number: optionalText,
    phone_number: z.string().trim().min(1, 'phone_number is required'),
    emergency_name: z.string().trim().min(1, 'emergency_name is required'),
    emergency_number: z.string().trim().min(1, 'emergency_number is required'),
    email: z.string().email().optional().or(z.literal('')),
    insurance_provider: z.string().optional(),
    insurance_number: z.string().optional(),
    insurance_plan: z.string().optional(),
    insurance_member_id: z.string().optional(),
    referred_by: z.string().optional(),
    last_dental_visit: z.string().optional(),
    recall_due: z.string().optional(),
    chief_complaint: z.string().optional(),
    allergies: z.string().optional(),
    medications: z.string().optional(),
    medical_conditions: z.string().optional(),
    medical_history: z.string().optional(),
    notes: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (!data.dob && !data.age) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'dob or age is required',
        path: ['dob']
      });
    }
  })
  .transform((data) => {
    const normalized = normalizePatientDemographics(data);
    if (normalized.error) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: normalized.error,
          path: ['dob']
        }
      ]);
    }
    return normalized;
  });

const appointmentAssignSchema = z.object({
  patientId: z.union([z.string(), z.number()]).transform((v) => String(v)),
  staffId: z.union([z.string(), z.number()]).optional().transform((v) => (v != null ? String(v) : undefined)),
  datetime: z.string().optional(),
  duration: z.union([z.string(), z.number()]).optional(),
  type: z.string().optional(),
  notes: z.string().optional(),
  auto: z.boolean().optional()
});

const appointmentCreateSchema = z.object({
  patientId: z.union([z.string(), z.number()]).transform((v) => String(v)),
  patientName: z.string().optional(),
  patientMrn: z.string().optional(),
  staffId: z.union([z.string(), z.number()]).optional(),
  staffName: z.string().optional(),
  datetime: z.string().optional(),
  duration: z.union([z.string(), z.number()]).optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  chair: z.string().optional(),
  notes: z.string().optional(),
  skipAssignmentFlow: z.boolean().optional()
});

const invoiceLineSchema = z.object({
  id: z.string().optional(),
  procedureCode: z.string().optional(),
  procedureName: z.string().optional(),
  description: z.string().optional(),
  toothNumber: z.string().optional(),
  quantity: z.union([z.string(), z.number()]).optional(),
  unitPrice: z.union([z.string(), z.number()]).optional(),
  discount: z.union([z.string(), z.number()]).optional()
});

const invoiceCreateSchema = z.object({
  patientId: z.union([z.string(), z.number()]).transform((v) => String(v)),
  patientName: z.string().trim().min(1, 'patientName is required'),
  patientMrn: z.string().optional(),
  items: z.array(invoiceLineSchema).min(1, 'At least one line item is required'),
  discount: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  treatmentPlanId: z.string().optional(),
  treatmentItemIds: z.array(z.string()).optional()
});

const paymentCreateSchema = z.object({
  invoiceId: z.union([z.string(), z.number()]).transform((v) => String(v)),
  amount: z.union([z.string(), z.number()]).refine((v) => Number(v) > 0, 'amount must be greater than 0'),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional()
});

module.exports = {
  authLoginSchema,
  authPasswordChangeSchema,
  patientCreateSchema,
  appointmentAssignSchema,
  appointmentCreateSchema,
  invoiceCreateSchema,
  paymentCreateSchema
};
