import { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import DarkModeToggle from '@/Components/DarkModeToggle';
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Checkbox } from "@/Components/ui/checkbox";
import { Alert, AlertDescription } from "@/Components/ui/alert";

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
                        <div className="mb-4">
                            <Alert>
                                <AlertDescription>{status}</AlertDescription>
                            </Alert>
                        </div>
                    )}

                    <div className="bg-card border-2 border-border rounded-2xl shadow-xl p-8">
                        <h2 className="text-2xl font-bold mb-8 text-foreground">Log in to your account</h2>

                        <form onSubmit={submit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        className="pl-11"
                                        placeholder="you@example.com"
                                        autoComplete="username"
                                        autoFocus
                                        onChange={(e) => setData('email', e.target.value)}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-destructive text-sm font-medium">{errors.email}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={data.password}
                                        className="pl-11 pr-12"
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-0 h-full"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </Button>
                                </div>
                                {errors.password && (
                                    <p className="text-destructive text-sm font-medium">{errors.password}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="remember"
                                    checked={data.remember}
                                    onCheckedChange={(checked) => setData('remember', checked)}
                                />
                                <Label htmlFor="remember" className="cursor-pointer select-none">
                                    Remember me
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                disabled={processing}
                            >
                                {processing ? 'Logging in...' : 'Log in'}
                            </Button>

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

