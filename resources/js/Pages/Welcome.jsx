import { Head, Link, usePage } from '@inertiajs/react';
import DarkModeToggle from '@/Components/DarkModeToggle';

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-background">
                <nav className="bg-card border-b border-border shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16 items-center">
                            <h1 className="text-xl font-bold text-primary">
                                Capacity Planner
                            </h1>
                            <div className="flex items-center gap-4">
                                {auth.user ? (
                                    <>
                                        <Link
                                            href={route('dashboard')}
                                            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                                        >
                                            Dashboard
                                        </Link>
                                        <Link
                                            href={route('calendar')}
                                            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                                        >
                                            Calendar
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href={route('login')}
                                            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                                        >
                                            Log in
                                        </Link>
                                        <Link
                                            href={route('register')}
                                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
                                        >
                                            Register
                                        </Link>
                                    </>
                                )}
                                <DarkModeToggle />
                            </div>
                        </div>
                    </div>
                </nav>
                
                <div className="flex items-center justify-center py-12 px-4">
                    <div className="max-w-4xl mx-auto w-full">
                        <div className="text-center mb-12">
                            <h2 className="text-5xl font-bold text-primary mb-4">
                                Capacity Planner
                            </h2>
                            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                                Streamline developer scheduling and project allocation with an intuitive visual interface.
                            </p>
                        </div>
                        
                        {!auth.user && (
                            <div className="text-center mb-8">
                                <Link
                                    href={route('login')}
                                    className="inline-block px-6 py-3 text-base font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl mr-4"
                                >
                                    Get Started
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="inline-block px-6 py-3 text-base font-medium border-2 border-primary text-primary rounded-lg hover:bg-primary/10 transition-all"
                                >
                                    Create Account
                                </Link>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-card border border-border rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                                <div className="flex items-center mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                                        <span className="text-primary text-xl font-bold">✓</span>
                                    </div>
                                    <h2 className="text-2xl font-semibold">Phase 1.1 Complete</h2>
                                </div>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2 font-bold">✓</span>
                                        <span className="text-muted-foreground">Inertia.js with React installed and configured</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2 font-bold">✓</span>
                                        <span className="text-muted-foreground">TypeScript support added</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2 font-bold">✓</span>
                                        <span className="text-muted-foreground">shadcn/ui foundation configured</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2 font-bold">✓</span>
                                        <span className="text-muted-foreground">Tailwind CSS with design tokens</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2 font-bold">✓</span>
                                        <span className="text-muted-foreground">Additional dependencies (date-fns, dnd-kit, Radix UI)</span>
                                    </li>
                                </ul>
                            </div>
                            
                            <div className="bg-card border border-border rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                                <div className="flex items-center mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                                        <span className="text-primary text-xl font-bold">✓</span>
                                    </div>
                                    <h2 className="text-2xl font-semibold">Phase 1.2 Complete</h2>
                                </div>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2 font-bold">✓</span>
                                        <span className="text-muted-foreground">Users table enhanced (role, work_days, visibility, annual_leave_default)</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2 font-bold">✓</span>
                                        <span className="text-muted-foreground">Projects table created with colors and soft deletes</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2 font-bold">✓</span>
                                        <span className="text-muted-foreground">Project Allocations table for scheduling</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2 font-bold">✓</span>
                                        <span className="text-muted-foreground">Annual Leave table for time-off management</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2 font-bold">✓</span>
                                        <span className="text-muted-foreground">Calendar Markers table for events</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2 font-bold">✓</span>
                                        <span className="text-muted-foreground">All models created with relationships</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="text-primary mr-2 font-bold">✓</span>
                                        <span className="text-muted-foreground">Database seeded with sample data</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

