import { useEffect, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import DarkModeToggle from '@/Components/DarkModeToggle';
import { Link } from '@inertiajs/react';

export default function Edit({ mustVerifyEmail, status, auth }) {
    const profileForm = useForm({
        name: auth.user.name,
        email: auth.user.email,
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

    const updateProfile = (e) => {
        e.preventDefault();
        profileForm.put(route('profile.update'), {
            preserveScroll: true,
        });
    };

    const updatePassword = (e) => {
        e.preventDefault();
        passwordForm.put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                passwordForm.reset();
                setShowCurrentPassword(false);
                setShowPassword(false);
                setShowPasswordConfirmation(false);
            },
        });
    };

    return (
        <>
            <Head title="Profile" />

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
                                {auth.user?.role === 'admin' && (
                                    <Link
                                        href={route('users.index')}
                                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded hover:bg-muted/50"
                                    >
                                        User Management
                                    </Link>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-muted-foreground">{auth.user?.name}</span>
                                <span className="text-sm font-medium text-foreground px-2.5 py-1.5 rounded bg-muted/50">
                                    Profile
                                </span>
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

                <div className="py-12">
                    <div className="max-w-2xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-card border border-border rounded-xl shadow-lg p-8 space-y-8">
                            <div>
                                <h2 className="text-3xl font-bold mb-2 text-primary">Profile Settings</h2>
                                <p className="text-muted-foreground">Manage your account information and password</p>
                            </div>

                            {status === 'profile-updated' && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-200 font-medium">
                                    ✓ Profile updated successfully.
                                </div>
                            )}

                            {status === 'password-updated' && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-200 font-medium">
                                    ✓ Password updated successfully.
                                </div>
                            )}

                            {/* Profile Information */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-semibold text-foreground">Profile Information</h3>
                                <form onSubmit={updateProfile} className="space-y-4">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium mb-2">
                                            Name
                                        </label>
                                        <input
                                            id="name"
                                            type="text"
                                            value={profileForm.data.name}
                                            onChange={(e) => profileForm.setData('name', e.target.value)}
                                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                            required
                                        />
                                        {profileForm.errors.name && (
                                            <div className="text-destructive text-sm mt-1">{profileForm.errors.name}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium mb-2">
                                            Email
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={profileForm.data.email}
                                            onChange={(e) => profileForm.setData('email', e.target.value)}
                                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                            required
                                        />
                                        {profileForm.errors.email && (
                                            <div className="text-destructive text-sm mt-1">{profileForm.errors.email}</div>
                                        )}
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium shadow-md hover:shadow-lg transition-all"
                                            disabled={profileForm.processing}
                                        >
                                            {profileForm.processing ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Password Update */}
                            <div className="border-t border-border pt-8">
                                <h3 className="text-xl font-semibold mb-4 text-foreground">Update Password</h3>
                                <form onSubmit={updatePassword} className="space-y-4">
                                    <div>
                                        <label htmlFor="current_password" className="block text-sm font-medium mb-2">
                                            Current Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="current_password"
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                value={passwordForm.data.current_password}
                                                onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                                                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showCurrentPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        {passwordForm.errors.current_password && (
                                            <div className="text-destructive text-sm mt-1">{passwordForm.errors.current_password}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium mb-2">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={passwordForm.data.password}
                                                onChange={(e) => passwordForm.setData('password', e.target.value)}
                                                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        {passwordForm.errors.password && (
                                            <div className="text-destructive text-sm mt-1">{passwordForm.errors.password}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="password_confirmation" className="block text-sm font-medium mb-2">
                                            Confirm New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="password_confirmation"
                                                type={showPasswordConfirmation ? 'text' : 'password'}
                                                value={passwordForm.data.password_confirmation}
                                                onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                                                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPasswordConfirmation ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        {passwordForm.errors.password_confirmation && (
                                            <div className="text-destructive text-sm mt-1">{passwordForm.errors.password_confirmation}</div>
                                        )}
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium shadow-md hover:shadow-lg transition-all"
                                            disabled={passwordForm.processing}
                                        >
                                            {passwordForm.processing ? 'Updating...' : 'Update Password'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

