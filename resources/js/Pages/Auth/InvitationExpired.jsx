import { Head, Link } from '@inertiajs/react';
import { AlertCircle } from 'lucide-react';
import DarkModeToggle from '@/Components/DarkModeToggle';

export default function InvitationExpired({ message }) {
    return (
        <>
            <Head title="Invitation Expired" />

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
                    </div>

                    <div className="bg-card border-2 border-border rounded-2xl shadow-xl p-8 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
                            <AlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <h2 className="text-2xl font-bold mb-4 text-foreground">Invitation Invalid</h2>
                        <p className="text-muted-foreground mb-6">{message}</p>
                        <Link
                            href={route('login')}
                            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold shadow-lg hover:shadow-xl"
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
