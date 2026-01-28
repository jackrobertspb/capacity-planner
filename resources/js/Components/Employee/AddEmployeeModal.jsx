import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { X, Copy, Check } from 'lucide-react';

export default function AddEmployeeModal({ onClose }) {
    // Close modal on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        capacity: 5,
        can_access_workspace: false,
        email: '',
        role: 'user',
    });
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});
    const [invitationUrl, setInvitationUrl] = useState(null);
    const [showInvitationDialog, setShowInvitationDialog] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            setErrors({ general: 'First name and last name are required' });
            return;
        }

        if (formData.can_access_workspace && !formData.email.trim()) {
            setErrors({ general: 'Email is required when workspace access is enabled' });
            return;
        }

        setProcessing(true);
        setErrors({});

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

        try {
            const response = await fetch('/api/employees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                router.reload({
                    only: ['employees'],
                    preserveScroll: true,
                    preserveState: true,
                    onFinish: () => {
                        // If there's an invitation URL, show the dialog instead of closing
                        if (data.invitation_url) {
                            setInvitationUrl(data.invitation_url);
                            setShowInvitationDialog(true);
                            setProcessing(false);
                        } else {
                            onClose();
                        }
                    }
                });
            } else {
                setErrors({ general: data.message || 'Failed to create employee' });
                setProcessing(false);
            }
        } catch (error) {
            console.error('Error creating employee:', error);
            setErrors({ general: 'An error occurred while creating the employee' });
            setProcessing(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(invitationUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCloseInvitationDialog = () => {
        setShowInvitationDialog(false);
        setInvitationUrl(null);
        onClose();
    };

    // Show invitation URL dialog
    if (showInvitationDialog) {
        return (
            <>
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 z-50"
                    onClick={handleCloseInvitationDialog}
                />

                {/* Modal */}
                <div
                    className="fixed z-50 w-full max-w-md bg-card rounded-lg shadow-2xl"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'hsl(var(--card))'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-primary">
                        <h2 className="text-xl font-semibold text-foreground">Person Created Successfully</h2>
                        <button
                            onClick={handleCloseInvitationDialog}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Copy the invitation link below and send it to the user. They will use this link to set their password and complete their registration.
                        </p>

                        <div className="flex gap-2">
                            <input
                                value={invitationUrl || ''}
                                readOnly
                                className="flex-1 px-3 py-2 bg-background border-0 rounded-md text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button
                                type="button"
                                onClick={handleCopyLink}
                                className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors shrink-0"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </button>
                        </div>

                        {copied && (
                            <p className="text-xs text-primary">
                                Invitation link copied to clipboard!
                            </p>
                        )}

                        <p className="text-xs text-muted-foreground">
                            This link will expire in 7 days.
                        </p>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleCloseInvitationDialog}
                                className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="fixed z-50 w-full max-w-md bg-card rounded-lg shadow-2xl"
                style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'hsl(var(--card))'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-primary">
                    <h2 className="text-xl font-semibold text-foreground">Add new person</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errors.general && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                            {errors.general}
                        </div>
                    )}

                    {/* First name */}
                    <div>
                        <label htmlFor="first_name" className="block text-sm font-medium text-foreground mb-2">
                            First name<span className="text-destructive">*</span>
                        </label>
                        <input
                            id="first_name"
                            type="text"
                            placeholder="E.g. John"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            required
                            className="w-full px-3 py-2 bg-background border-0 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Last name */}
                    <div>
                        <label htmlFor="last_name" className="block text-sm font-medium text-foreground mb-2">
                            Last name<span className="text-destructive">*</span>
                        </label>
                        <input
                            id="last_name"
                            type="text"
                            placeholder="E.g. Doe"
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            required
                            className="w-full px-3 py-2 bg-background border-0 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Capacity */}
                    <div>
                        <label htmlFor="capacity" className="block text-sm font-medium text-foreground mb-2">
                            Capacity<span className="text-destructive">*</span>
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                id="capacity"
                                type="number"
                                step="0.5"
                                min="0"
                                max="7"
                                placeholder="E.g 5"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) || 0 })}
                                required
                                className="w-32 px-3 py-2 bg-background border-0 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <span className="text-sm text-muted-foreground">Days per week</span>
                        </div>
                    </div>

                    {/* Can access workspace toggle */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, can_access_workspace: !formData.can_access_workspace })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                formData.can_access_workspace ? 'bg-green-500' : 'bg-gray-500'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                                    formData.can_access_workspace ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                        <label className="text-sm font-medium text-foreground select-none">
                            Can access workspace
                        </label>
                    </div>

                    {/* Email and role (shown when workspace access is enabled) */}
                    {formData.can_access_workspace && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="email" className="text-sm font-medium text-foreground">
                                    Email
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="text-sm px-3 py-1.5 bg-background border-0 rounded-md text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <input
                                id="email"
                                type="email"
                                placeholder="E.g. john@email.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required={formData.can_access_workspace}
                                className="w-full px-3 py-2 bg-background border-0 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                You will receive a sign-up link to share with them.
                            </p>
                        </div>
                    )}

                    {/* Footer buttons */}
                    <div className="flex items-center gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? 'Adding...' : 'Add person'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
