import { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import DarkModeToggle from '@/Components/DarkModeToggle';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onSuccess: () => {
                // Force full page reload to get fresh CSRF token after session regeneration
                window.location.href = route('calendar');
            },
        });
    };

    return (
        <>
            <Head title="Log in" />

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
                        <p className="text-muted-foreground text-lg">Sign in to continue</p>
                    </div>

                    {status && (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md font-medium text-sm text-green-800 dark:text-green-200">
                            {status}
                        </div>
                    )}

                    <div className="bg-card border-2 border-border rounded-2xl shadow-xl p-8">
                        <h2 className="text-2xl font-bold mb-8 text-foreground">Log in to your account</h2>

                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold mb-2 text-foreground">
                                    Email
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        className="w-full pl-11 pr-4 py-3 border-2 border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-background"
                                        placeholder="you@example.com"
                                        autoComplete="username"
                                        autoFocus
                                        onChange={(e) => setData('email', e.target.value)}
                                    />
                                </div>
                                {errors.email && (
                                    <div className="text-destructive text-sm mt-2 font-medium">{errors.email}</div>
                                )}
                            </div>

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
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
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

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="h-4 w-4 rounded border-2 border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 transition-all cursor-pointer"
                                />
                                <label htmlFor="remember" className="ml-2 text-sm font-medium text-foreground cursor-pointer select-none">
                                    Remember me
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl"
                                disabled={processing}
                            >
                                {processing ? 'Logging in...' : 'Log in'}
                            </button>

                            <div className="mt-6 pt-6 border-t border-border">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <Link
                                        href={route('register')}
                                        className="text-sm font-medium text-primary hover:text-primary/80"
                                    >
                                        Don't have an account? <span className="underline underline-offset-2">Register</span>
                                    </Link>
                                    {canResetPassword && (
                                        <Link
                                            href={route('password.request')}
                                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            Forgot password?
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}

