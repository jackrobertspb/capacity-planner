import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Lock, User, Mail } from 'lucide-react';
import DarkModeToggle from '@/Components/DarkModeToggle';

export default function CompleteRegistration({ token, user }) {
    const { data, setData, post, processing, errors } = useForm({
        token: token,
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post(route('invitation.complete'), {
            onSuccess: () => {
                window.location.href = route('calendar');
            },
        });
    };

    return (
        <>
            <Head title="Complete Your Account" />

            <div className="min-h-screen bg-background flex flex-col sm:justify-center items-center pt-6 sm:pt-0 px-4">
                <div className="absolute top-6 right-6">
                    <DarkModeToggle />
                </div>
                <div className="w-full sm:max-w-md">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                            <svg className="w-9 h-9 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-bold mb-3 text-primary">
                            Capacity Planner
                        </h1>
                        <p className="text-muted-foreground text-lg">Complete your account setup</p>
                    </div>

                    <div className="bg-card border-2 border-border rounded-2xl shadow-xl p-8">
                        <h2 className="text-2xl font-bold mb-2 text-foreground">Welcome!</h2>
                        <p className="text-muted-foreground mb-8">Set a password to finish creating your account.</p>

                        <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
                            <div className="flex items-center gap-3 mb-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">{user.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{user.email}</span>
                            </div>
                        </div>

                        <form onSubmit={submit} className="space-y-6">
                            {errors.token && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                    <p className="text-destructive text-sm font-medium">{errors.token}</p>
                                </div>
                            )}

                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold mb-2 text-foreground">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={data.password}
                                        className="w-full pl-11 pr-12 py-3 border-2 border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background"
                                        placeholder="Create a password"
                                        autoComplete="new-password"
                                        autoFocus
                                        onChange={(e) => setData('password', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <div className="text-destructive text-sm mt-2 font-medium">{errors.password}</div>
                                )}
                            </div>

                            <div>
                                <label htmlFor="password_confirmation" className="block text-sm font-semibold mb-2 text-foreground">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        id="password_confirmation"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="password_confirmation"
                                        value={data.password_confirmation}
                                        className="w-full pl-11 pr-12 py-3 border-2 border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background"
                                        placeholder="Confirm your password"
                                        autoComplete="new-password"
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                                {errors.password_confirmation && (
                                    <div className="text-destructive text-sm mt-2 font-medium">{errors.password_confirmation}</div>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl"
                                disabled={processing}
                            >
                                {processing ? 'Creating account...' : 'Complete Account Setup'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
