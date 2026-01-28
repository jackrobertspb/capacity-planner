import { Head, Link, useForm } from '@inertiajs/react';
import DarkModeToggle from '@/Components/DarkModeToggle';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <>
            <Head title="Forgot Password" />

            <div className="min-h-screen bg-background flex flex-col sm:justify-center items-center pt-6 sm:pt-0">
                <div className="absolute top-4 right-4">
                    <DarkModeToggle />
                </div>
                <div className="w-full sm:max-w-md px-6 py-4">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                            <svg className="w-9 h-9 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-bold mb-3 text-primary">Capacity Planner</h1>
                    </div>

                    {status && (
                        <div className="mb-4 font-medium text-sm text-green-600">
                            {status}
                        </div>
                    )}

                    <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                        <h3 className="text-xl font-semibold mb-6">Forgot your password?</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            No problem. Just let us know your email address and we will email you a password reset link that will allow you to choose a new one.
                        </p>

                        <form onSubmit={submit}>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium mb-2">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    autoComplete="username"
                                    autoFocus
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                />
                                {errors.email && (
                                    <div className="text-destructive text-sm mt-1">{errors.email}</div>
                                )}
                            </div>

                            <div className="flex items-center justify-between mt-6">
                                <Link
                                    href={route('login')}
                                    className="text-sm text-primary hover:underline"
                                >
                                    Back to login
                                </Link>

                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                                    disabled={processing}
                                >
                                    {processing ? 'Sending...' : 'Email Password Reset Link'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}


