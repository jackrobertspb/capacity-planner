import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import DarkModeToggle from '@/Components/DarkModeToggle';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/Components/ui/select";
import { Label } from "@/Components/ui/label";
import { Badge } from "@/Components/ui/badge";
import { toast } from "sonner";

export default function Users({ users }) {
    const { auth } = usePage().props;
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'guest',
    });
    const [invitationUrl, setInvitationUrl] = useState(null);
    const [showInvitationDialog, setShowInvitationDialog] = useState(false);
    const [copied, setCopied] = useState(false);

    const roleOptions = [
        { value: 'guest', label: 'Guest', description: 'View only access' },
        { value: 'admin', label: 'Admin', description: 'Full access' },
    ];

    const dayOptions = [
        { value: 1, label: 'Mon' },
        { value: 2, label: 'Tue' },
        { value: 3, label: 'Wed' },
        { value: 4, label: 'Thu' },
        { value: 5, label: 'Fri' },
        { value: 6, label: 'Sat' },
        { value: 7, label: 'Sun' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
            const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
            const method = editingUser ? 'PUT' : 'POST';

            const payload = { ...formData };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                router.reload({ only: ['users'] });
                handleCloseForm();

                // Show invitation URL for new users
                if (!editingUser && data.invitation_url) {
                    setInvitationUrl(data.invitation_url);
                    setShowInvitationDialog(true);
                    setCopied(false);
                } else {
                    toast.success('User saved successfully!');
                }
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Failed to save user');
            }
        } catch (error) {
            console.error('Error saving user:', error);
            toast.error('Failed to save user');
        }
    };

    const handleDelete = async (userId) => {
        if (userId === auth.user?.id) {
            toast.error('You cannot delete your own account');
            return;
        }

        if (!confirm('Are you sure you want to delete this user? This will also delete all their allocations and annual leave records.')) {
            return;
        }

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });

            if (response.ok) {
                toast.success('User deleted successfully!');
                router.reload({ only: ['users'] });
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Failed to delete user');
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role,
        });
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingUser(null);
        setFormData({
            name: '',
            email: '',
            role: 'guest',
        });
    };


    return (
        <>
            <Head title="User Management" />

            <div className="min-h-screen bg-background">
                <nav className="bg-card border-b border-border sticky top-0 z-50">
                    <div className="max-w-full px-4">
                        <div className="flex justify-between h-14">
                            <div className="flex items-center gap-4">
                                <Link
                                    href={route('calendar')}
                                    className="text-base font-semibold text-foreground hover:text-primary transition-colors"
                                >
                                    Capacity Planner
                                </Link>
                                <span className="text-sm font-medium text-foreground px-2.5 py-1.5 rounded bg-muted/50">
                                    User Management
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-muted-foreground">{auth.user?.name}</span>
                                <Link
                                    href={route('profile.edit')}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded hover:bg-muted/50"
                                >
                                    Profile
                                </Link>
                                <DarkModeToggle />
                                <Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                    className="text-sm font-medium text-muted-foreground hover:text-destructive transition-colors px-2.5 py-1.5 rounded hover:bg-destructive/10"
                                >
                                    Log Out
                                </Link>
                            </div>
                        </div>
                    </div>
                </nav>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage team members, their work schedules, and access permissions
                            </p>
                        </div>
                        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add User
                        </Button>
                    </div>

                    {/* Users Table */}
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground">Name</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground">Email</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground">Role</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground">Work Days</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground">Leave</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-foreground">Visible</th>
                                    <th className="text-right px-4 py-3 text-sm font-medium text-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="[&>tr]:border-b [&>tr]:border-gray-700 [&>tr:last-child]:border-0">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm text-foreground font-medium">
                                            {user.name}
                                            {user.id === auth.user?.id && (
                                                <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'user' ? 'default' : 'secondary'}>
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {(user.work_days || []).map(d => dayOptions.find(o => o.value === d)?.label).join(', ')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {user.annual_leave_default || 25} days
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.is_visible ? (
                                                <Eye className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(user)}
                                                    title="Edit user"
                                                    className="h-8 w-8"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(user.id)}
                                                    title="Delete user"
                                                    disabled={user.id === auth.user?.id}
                                                    className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                                            <p className="text-lg mb-2">No users yet</p>
                                            <p className="text-sm">Click "Add User" to create your first team member</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@example.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role *</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) => setFormData({ ...formData, role: value })}
                            >
                                <SelectTrigger id="role">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roleOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label} - {option.description}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={handleCloseForm} className="flex-1">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1">
                                {editingUser ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Invitation URL Modal */}
            <Dialog open={showInvitationDialog} onOpenChange={setShowInvitationDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>User Created Successfully</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Copy the invitation link below and send it to the user. They will use this link to set their password and complete their registration.
                        </p>

                        <div className="flex gap-2">
                            <Input
                                value={invitationUrl || ''}
                                readOnly
                                className="flex-1 font-mono text-sm"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    navigator.clipboard.writeText(invitationUrl);
                                    setCopied(true);
                                    toast.success('Invitation link copied to clipboard!');
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className="shrink-0"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            This link will expire in 7 days.
                        </p>

                        <div className="flex justify-end pt-2">
                            <Button onClick={() => setShowInvitationDialog(false)}>
                                Done
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
