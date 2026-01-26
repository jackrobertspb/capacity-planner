import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, X } from 'lucide-react';
import DarkModeToggle from '@/Components/DarkModeToggle';

export default function Users({ users }) {
    const { auth } = usePage().props;
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user',
        work_days: [1, 2, 3, 4, 5],
        annual_leave_default: 25,
        is_visible: true,
    });

    const roleOptions = [
        { value: 'guest', label: 'Guest', description: 'View only access' },
        { value: 'user', label: 'User', description: 'Can manage own allocations' },
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
            // Don't send password if editing and it's empty
            if (editingUser && !payload.password) {
                delete payload.password;
            }

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
                router.reload({ only: ['users'] });
                handleCloseForm();
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'Failed to save user');
            }
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Failed to save user');
        }
    };

    const handleDelete = async (userId) => {
        if (userId === auth.user?.id) {
            alert('You cannot delete your own account');
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
                router.reload({ only: ['users'] });
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            work_days: user.work_days || [1, 2, 3, 4, 5],
            annual_leave_default: user.annual_leave_default || 25,
            is_visible: user.is_visible,
        });
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingUser(null);
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'user',
            work_days: [1, 2, 3, 4, 5],
            annual_leave_default: 25,
            is_visible: true,
        });
    };

    const toggleWorkDay = (day) => {
        setFormData(prev => ({
            ...prev,
            work_days: prev.work_days.includes(day)
                ? prev.work_days.filter(d => d !== day)
                : [...prev.work_days, day].sort((a, b) => a - b)
        }));
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
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 font-medium cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            Add User
                        </button>
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
                            <tbody className="divide-y divide-border">
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
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                                user.role === 'user' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-gray-500/20 text-gray-400'
                                            }`}>
                                                {user.role}
                                            </span>
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
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-1.5 hover:bg-muted rounded transition-colors cursor-pointer"
                                                    title="Edit user"
                                                >
                                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-1.5 hover:bg-destructive/20 rounded transition-colors cursor-pointer"
                                                    title="Delete user"
                                                    disabled={user.id === auth.user?.id}
                                                >
                                                    <Trash2 className={`h-4 w-4 ${user.id === auth.user?.id ? 'text-muted-foreground/30' : 'text-destructive'}`} />
                                                </button>
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
            {showForm && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={handleCloseForm}
                >
                    <div
                        className="bg-card rounded-lg p-6 max-w-lg w-full shadow-xl border border-border max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-foreground">
                                {editingUser ? 'Edit User' : 'Add User'}
                            </h2>
                            <button
                                onClick={handleCloseForm}
                                className="p-1 hover:bg-muted rounded transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Password {editingUser ? '(leave blank to keep current)' : '*'}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                                    placeholder="••••••••"
                                    required={!editingUser}
                                    minLength={8}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Role *
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground cursor-pointer"
                                >
                                    {roleOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label} - {option.description}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Work Days
                                </label>
                                <div className="flex gap-2">
                                    {dayOptions.map(day => (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => toggleWorkDay(day.value)}
                                            className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
                                                formData.work_days.includes(day.value)
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Annual Leave Allowance (days)
                                </label>
                                <input
                                    type="number"
                                    value={formData.annual_leave_default}
                                    onChange={(e) => setFormData({ ...formData, annual_leave_default: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                                    min={0}
                                    max={365}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="is_visible"
                                    checked={formData.is_visible}
                                    onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                                    className="h-4 w-4 rounded border-border cursor-pointer"
                                />
                                <label htmlFor="is_visible" className="text-sm text-foreground cursor-pointer">
                                    Visible on calendar
                                </label>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseForm}
                                    className="flex-1 px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium cursor-pointer"
                                >
                                    {editingUser ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
