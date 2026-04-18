import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress,
  Divider, Card, CardContent, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Alert,
} from '@mui/material';
import {
  ArrowBack,
  Description as ContractIcon,
  Edit as EditIcon,
  Send as SendIcon,
  CheckCircle as SignIcon,
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  CalendarMonth as CalendarIcon,
  Payments as MoneyIcon,
  Lock as LockIcon,
  Gavel as TermsIcon,
  VpnKey as KeyIcon,
} from '@mui/icons-material';
import { useContractDetail } from '../../../../application/hooks/useContracts';
import SignaturePad from '../../../components/SignaturePad';
import type { ContractStatus } from '../../../../domain/entities/Contract';
import CheckInFlow from '../pipeline/CheckInFlow';

/** Contract status config */
const STATUS_CONFIG: Record<ContractStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6b7280' },
  pending_review: { label: 'Pending Review', color: '#f59e0b' },
  pending_signature: { label: 'Pending Signature', color: '#8b5cf6' },
  signed: { label: 'Signed', color: '#3b82f6' },
  active: { label: 'Active', color: '#10b981' },
  expired: { label: 'Expired', color: '#9ca3af' },
  terminated: { label: 'Terminated', color: '#ef4444' },
};

function formatDate(date?: string | Date): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatCurrency(amount?: number): string {
  if (!amount && amount !== 0) return '—';
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

export default function ContractDetail() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const {
    contract, loading, error,
    fetchContract, signContract, updateStatus, generatePDF, downloadPDF,
  } = useContractDetail(contractId);

  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string;
    action: () => Promise<void>; color: string;
  }>({ open: false, title: '', message: '', action: async () => {}, color: '' });

  useEffect(() => { fetchContract(); }, [fetchContract]);

  const handleSendForReview = () => {
    setConfirmDialog({
      open: true, title: 'Send for Review', color: '#f59e0b',
      message: 'Send this contract to the tenant for review? They will be notified.',
      action: async () => {
        setActionLoading('review');
        try { await updateStatus('pending_review'); }
        finally { setActionLoading(null); setConfirmDialog(p => ({ ...p, open: false })); }
      },
    });
  };

  const handleSendForSignature = () => {
    setConfirmDialog({
      open: true, title: 'Send for Signature', color: '#8b5cf6',
      message: 'Mark this contract as ready for signatures? Both parties will need to sign.',
      action: async () => {
        setActionLoading('signature');
        try { await updateStatus('pending_signature'); }
        finally { setActionLoading(null); setConfirmDialog(p => ({ ...p, open: false })); }
      },
    });
  };

  const handleSign = async () => {
    if (!signatureData) return;
    setActionLoading('sign');
    try {
      await signContract(signatureData, 'landlord');
      setSignOpen(false);
      setSignatureData(null);
    } catch (err) { console.error('Failed to sign:', err); }
    finally { setActionLoading(null); }
  };

  const handleGeneratePDF = async () => {
    setActionLoading('pdf');
    try { await generatePDF(); }
    catch (err) { console.error('Failed to generate PDF:', err); }
    finally { setActionLoading(null); }
  };

  const handleDownloadPDF = async () => {
    setActionLoading('download');
    try { await downloadPDF(); }
    catch (err) { console.error('Failed to download:', err); }
    finally { setActionLoading(null); }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  if (error || !contract) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/contracts')} sx={{ mb: 2 }}>Back to Contracts</Button>
        <Typography color="error">{error || 'Contract not found'}</Typography>
      </Box>
    );
  }

  const app = contract.application as any;
  const statusConfig = STATUS_CONFIG[contract.status] || { label: contract.status, color: '#6b7280' };
  const tenantName = app?.personalDetails?.fullName || app?.user?.name || 'Unknown Tenant';
  const propertyName = app?.property?.name || 'Unknown Property';
  const unitName = app?.unit?.unitIdentifier || '—';

  const isDraft = contract.status === 'draft';
  const canSendReview = contract.status === 'draft';
  const canSendSignature = contract.status === 'pending_review';
  const canSign = contract.status === 'pending_signature' && !contract.landlordSignature;
  const canCheckIn = contract.status === 'signed';
  const canGeneratePDF = ['signed', 'active'].includes(contract.status);
  const canDownload = !!contract.documentUrl;

  // Lock-in progress
  const start = new Date(contract.startDate);
  const now = new Date();
  const monthsElapsed = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth());
  const lockInProgress = contract.lockInPeriod ? Math.min(100, (monthsElapsed / contract.lockInPeriod) * 100) : 0;
  const lockInColor = lockInProgress >= 90 ? '#ef4444' : lockInProgress >= 75 ? '#f59e0b' : '#10b981';

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/hub/contracts')} sx={{ mb: 3, fontWeight: 600 }}>
        Back to Contracts
      </Button>

      {/* Status Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${statusConfig.color}12 0%, ${statusConfig.color}06 100%)`
              : `linear-gradient(135deg, ${statusConfig.color}08 0%, ${statusConfig.color}04 100%)`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 52, height: 52, borderRadius: 3,
                  background: `linear-gradient(135deg, ${statusConfig.color}30, ${statusConfig.color}60)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ContractIcon sx={{ color: statusConfig.color, fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800}>Lease Agreement</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Box
                    sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.75,
                      px: 2, py: 0.5, borderRadius: 2, fontSize: '0.8rem', fontWeight: 700,
                      color: statusConfig.color, bgcolor: `${statusConfig.color}18`,
                      border: `1px solid ${statusConfig.color}30`,
                    }}
                  >
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusConfig.color, boxShadow: `0 0 8px ${statusConfig.color}60` }} />
                    {statusConfig.label}
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1 }}>
              <Typography variant="body2" color="text.secondary">Tenant: <strong>{tenantName}</strong></Typography>
              <Typography variant="body2" color="text.secondary">Property: <strong>{propertyName}</strong></Typography>
              <Typography variant="body2" color="text.secondary">Unit: <strong>{unitName}</strong></Typography>
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 180 }}>
            {isDraft && (
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/hub/contracts/${contractId}/edit`)}
                sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}>Edit Draft</Button>
            )}
            {canSendReview && (
              <Button variant="contained" startIcon={<SendIcon />} onClick={handleSendForReview}
                disabled={!!actionLoading}
                sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' }, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}>
                Send for Review
              </Button>
            )}
            {canSendSignature && (
              <Button variant="contained" startIcon={<SignIcon />} onClick={handleSendForSignature}
                disabled={!!actionLoading}
                sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' }, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}>
                Ready for Signature
              </Button>
            )}
            {canSign && (
              <Button variant="contained" startIcon={<SignIcon />} onClick={() => setSignOpen(true)}
                disabled={!!actionLoading}
                sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' }, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}>
                Sign Contract
              </Button>
            )}
            {canCheckIn && (
              <Button variant="contained" startIcon={<KeyIcon />} onClick={() => setCheckInOpen(true)}
                disabled={!!actionLoading}
                sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}>
                Proceed to Check-In
              </Button>
            )}
            {canGeneratePDF && (
              <Button variant="outlined" startIcon={actionLoading === 'pdf' ? <CircularProgress size={16} /> : <PdfIcon />}
                onClick={handleGeneratePDF} disabled={!!actionLoading}
                sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}>
                Generate PDF
              </Button>
            )}
            {canDownload && (
              <Button variant="outlined" startIcon={actionLoading === 'download' ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={handleDownloadPDF} disabled={!!actionLoading}
                sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}>
                Download PDF
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Detail Cards */}
      <Grid container spacing={3}>
        {/* Lease Terms */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%', '&:hover': { boxShadow: '0 4px 24px rgba(0,0,0,0.06)' } }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<CalendarIcon />} title="Lease Terms" color="#6366f1" />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <InfoRow icon={<CalendarIcon fontSize="small" />} label="Start Date" value={formatDate(contract.startDate)} />
                <InfoRow icon={<CalendarIcon fontSize="small" />} label="End Date" value={formatDate(contract.endDate)} />
                <InfoRow icon={<LockIcon fontSize="small" />} label="Lock-in Period" value={`${contract.lockInPeriod} months`} />
                <Divider />
                {/* Lock-in Progress */}
                {contract.lockInPeriod > 0 && (
                  <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Lock-In Progress
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ color: lockInColor }}>
                          Month {monthsElapsed} of {contract.lockInPeriod}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                          {Math.round(lockInProgress)}%
                        </Typography>
                      </Box>
                      <Box sx={{ width: '100%', height: 10, borderRadius: 5, bgcolor: 'action.hover' }}>
                        <Box sx={{ width: `${lockInProgress}%`, height: '100%', borderRadius: 5, bgcolor: lockInColor, transition: 'width 0.5s ease' }} />
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Financials */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%', '&:hover': { boxShadow: '0 4px 24px rgba(0,0,0,0.06)' } }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<MoneyIcon />} title="Financial Terms" color="#10b981" />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <InfoRow icon={<MoneyIcon fontSize="small" />} label="Monthly Rent" value={formatCurrency(contract.monthlyRent)} highlight />
                <InfoRow label="Security Deposit" value={formatCurrency(contract.securityDeposit)} />
                <InfoRow label="Advance Payment" value={formatCurrency(contract.advancePayment)} />
                <Divider />
                <InfoRow label="Utility Included in Rent" value={contract.utilityIncludedInRent ? 'Yes' : 'No'} />
                <InfoRow label="Rate Type" value={
                  <Chip label={contract.rateType === 'fixed' ? 'Fixed Rate' : 'Submetered'} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                } />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Terms & Conditions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 4, '&:hover': { boxShadow: '0 4px 24px rgba(0,0,0,0.06)' } }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<TermsIcon />} title="Terms & Conditions" color="#f59e0b" />
              {contract.terms ? (
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: (t) => t.palette.mode === 'dark' ? 'grey.900' : 'grey.50', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{contract.terms}</Typography>
                </Paper>
              ) : (
                <Typography variant="body2" color="text.disabled" fontStyle="italic">No custom terms specified</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Signatures */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 4, '&:hover': { boxShadow: '0 4px 24px rgba(0,0,0,0.06)' } }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<SignIcon />} title="Signatures" color="#8b5cf6" />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Landlord Signature */}
                <Box>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                    Landlord Signature
                  </Typography>
                  {contract.landlordSignature ? (
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 1 }}>
                      <Box component="img" src={contract.landlordSignature} alt="Landlord signature"
                        sx={{ maxWidth: '100%', maxHeight: 100, objectFit: 'contain', display: 'block', mx: 'auto' }} />
                    </Box>
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: 3 }}>
                      <Typography variant="body2" color="text.disabled" fontStyle="italic">Not yet signed</Typography>
                    </Box>
                  )}
                </Box>

                {/* Tenant Signature */}
                <Box>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                    Tenant Signature
                  </Typography>
                  {contract.userSignature ? (
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 1 }}>
                      <Box component="img" src={contract.userSignature} alt="Tenant signature"
                        sx={{ maxWidth: '100%', maxHeight: 100, objectFit: 'contain', display: 'block', mx: 'auto' }} />
                    </Box>
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: 3 }}>
                      <Typography variant="body2" color="text.disabled" fontStyle="italic">Not yet signed</Typography>
                    </Box>
                  )}
                </Box>

                {contract.signedAt && (
                  <Alert severity="success" sx={{ borderRadius: 2 }}>
                    Both parties signed on {formatDate(contract.signedAt)}
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sign Contract Dialog */}
      <Dialog open={signOpen} onClose={() => setSignOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SignIcon sx={{ color: '#3b82f6' }} />
            Sign Contract
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Draw your signature below. This will be your legally binding digital signature on the lease agreement.
          </Typography>
          <SignaturePad
            height={180}
            onSignatureChange={(data) => setSignatureData(data)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setSignOpen(false); setSignatureData(null); }} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSign} disabled={!signatureData || !!actionLoading}
            sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' }, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}>
            {actionLoading === 'sign' ? <CircularProgress size={20} color="inherit" /> : 'Apply Signature'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(p => ({ ...p, open: false }))}
        maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setConfirmDialog(p => ({ ...p, open: false }))} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={confirmDialog.action} disabled={!!actionLoading}
            sx={{ bgcolor: confirmDialog.color, '&:hover': { bgcolor: confirmDialog.color, filter: 'brightness(0.9)' }, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}>
            {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Check-In Dialog */}
      <CheckInFlow
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        contract={contract}
      />
    </Box>
  );
}

function SectionHeader({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
      <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </Box>
      <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
    </Box>
  );
}

function InfoRow({ icon, label, value, highlight }: { icon?: React.ReactNode; label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      {icon && <Box sx={{ color: 'text.secondary', mt: 0.25, flexShrink: 0 }}>{icon}</Box>}
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
          {label}
        </Typography>
        <Box sx={{ mt: 0.25, color: highlight ? 'primary.main' : 'text.primary' }}>
          {typeof value === 'string' ? <Typography variant="body2" fontWeight={highlight ? 600 : 400}>{value}</Typography> : value}
        </Box>
      </Box>
    </Box>
  );
}
