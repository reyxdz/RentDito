import { useState } from 'react';
import { Box, TextField, Grid, Divider, Typography } from '@mui/material';
import { useAuth } from '../../application/context/AuthContext';
import { useApplications } from '../../application/hooks/useApplications';
import FormDialog from './FormDialog';

/** Context about the property/unit the user is applying to */
export interface ApplicationContext {
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitIdentifier: string;
}

export interface ApplicationFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Property/unit context — must be provided when `open` is true */
  context: ApplicationContext | null;
  /** Called after a successful submission with the new application */
  onSuccess?: (applicationId: string) => void;
}

/**
 * Self-contained rental application form dialog.
 *
 * Reusable across any page that has property/unit context
 * (e.g. UnitDetailPage, InquiryConversation).
 * Follows clean architecture — owns its form state internally,
 * delegates persistence to the application-layer hook.
 */
export default function ApplicationFormDialog({
  open,
  onClose,
  context,
  onSuccess,
}: ApplicationFormDialogProps) {
  const { user } = useAuth();
  const { createApplication, loading: submitting } = useApplications();

  // ── Form state ───────────────────────────────────────────────────────
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    occupation: '',
    school: '',
    address: '',
    ecName: '',
    ecPhone: '',
    ecRelation: '',
  });

  // Reset form when the dialog opens
  const handleOpen = () => {
    setFormError(null);
    setForm({
      fullName: user?.name || '',
      phone: '',
      occupation: '',
      school: '',
      address: '',
      ecName: '',
      ecPhone: '',
      ecRelation: '',
    });
  };

  // ── Submission ───────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fullName || !form.phone || !form.occupation || !form.address) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (!form.ecName || !form.ecPhone || !form.ecRelation) {
      setFormError('Please provide emergency contact details.');
      return;
    }
    if (!user || !context) return;

    try {
      const newApp = await createApplication({
        propertyId: context.propertyId,
        propertyName: context.propertyName,
        unitId: context.unitId,
        unitIdentifier: context.unitIdentifier,
        userId: user.id,
        userName: user.name || 'User',
        personalDetails: {
          fullName: form.fullName,
          phone: form.phone,
          occupation: form.occupation,
          school: form.school || undefined,
          address: form.address,
          emergencyContact: {
            name: form.ecName,
            phone: form.ecPhone,
            relation: form.ecRelation,
          },
        },
        documents: ['valid_id.jpg'], // Mock document upload
      });
      onClose();
      onSuccess?.(newApp.id);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit application');
    }
  };

  return (
    <FormDialog
      open={open}
      title="Apply for This Unit"
      submitText="Submit Application"
      loading={submitting}
      onClose={onClose}
      onSubmit={handleSubmit}
      // Reset form state each time the dialog transitions in
      {...(open ? { ref: undefined } : {})}
    >
      {/* Trigger reset when dialog opens */}
      <ResetOnMount onMount={handleOpen} key={open ? 'open' : 'closed'} />

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        You're applying for <strong>{context?.unitIdentifier}</strong>. Please
        fill in your details below.
      </Typography>

      {formError && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {formError}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: 'primary.main' }}
        >
          Personal Information
        </Typography>
        <TextField
          fullWidth
          label="Full Name"
          required
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
        />
        <TextField
          fullWidth
          label="Phone Number"
          required
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="09171234567"
        />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Occupation"
              required
              value={form.occupation}
              onChange={(e) =>
                setForm((f) => ({ ...f, occupation: e.target.value }))
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="School (if student)"
              value={form.school}
              onChange={(e) =>
                setForm((f) => ({ ...f, school: e.target.value }))
              }
            />
          </Grid>
        </Grid>
        <TextField
          fullWidth
          label="Address"
          required
          multiline
          rows={2}
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
        />

        <Divider sx={{ my: 1 }} />

        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: 'primary.main' }}
        >
          Emergency Contact
        </Typography>
        <TextField
          fullWidth
          label="Contact Name"
          required
          value={form.ecName}
          onChange={(e) => setForm((f) => ({ ...f, ecName: e.target.value }))}
        />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Contact Phone"
              required
              value={form.ecPhone}
              onChange={(e) =>
                setForm((f) => ({ ...f, ecPhone: e.target.value }))
              }
              placeholder="09189876543"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Relation"
              required
              value={form.ecRelation}
              onChange={(e) =>
                setForm((f) => ({ ...f, ecRelation: e.target.value }))
              }
              placeholder="e.g. Mother, Father, Sibling"
            />
          </Grid>
        </Grid>
      </Box>
    </FormDialog>
  );
}

/**
 * Tiny helper that fires a callback on mount.
 * Used to reset form state when the dialog opens (via key change).
 */
function ResetOnMount({ onMount }: { onMount: () => void }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => onMount());
  return null;
}
