import { Head, Link, usePage } from '@inertiajs/react';
import DarkModeToggle from '@/Components/DarkModeToggle';

export default function Dashboard() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Dashboard" />

            <div className="min-h-screen bg-background">
                <nav className="bg-card border-b border-border shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex items-center gap-6">
                                <h1 className="text-xl font-bold text-primary">
                                    Capacity Planner
                                </h1>
                                <Link
                                    href={route('calendar')}
                                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                                >
                                    Calendar
                                </Link>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium">{auth.user?.name}</span>
                                {auth.user?.role === 'admin' && (
                                    <Link
                                        href="/admin"
                                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                                    >
                                        Admin Panel
                                    </Link>
                                )}
                                <Link
                                    href={route('profile.edit')}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Profile
                                </Link>
                                <DarkModeToggle />
                                <Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                    className="text-sm font-medium text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    Log Out
                                </Link>
                            </div>
                        </div>
                    </div>
                </nav>

                <div className="py-12">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
                            <div className="mb-6">
                                <h2 className="text-3xl font-bold mb-2 text-primary">
                                    Welcome back, {auth.user?.name}!
                                </h2>
                                <p className="text-muted-foreground">
                                    Manage your team's capacity and project allocations with ease.
                                </p>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <Link
                                    href={route('calendar')}
                                    className="group p-6 bg-primary/10 border-2 border-primary/30 rounded-xl hover:border-primary/60 transition-all hover:shadow-xl hover:scale-[1.02]"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-bold text-foreground">Calendar View</h3>
                                        <span className="text-primary text-2xl group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        View and manage project allocations, annual leave, and calendar markers
                                    </p>
                                </Link>

                                {auth.user?.role === 'admin' && (
                                    <Link
                                        href="/admin"
                                        className="group p-6 bg-primary/10 border-2 border-primary/30 rounded-xl hover:border-primary/60 transition-all hover:shadow-xl hover:scale-[1.02]"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-bold text-foreground">Admin Panel</h3>
                                            <span className="text-primary text-2xl group-hover:translate-x-1 transition-transform">→</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Manage employees, projects, annual leave, and calendar markers
                                        </p>
                                    </Link>
                                )}
                            </div>
                            
                            <div className="p-6 bg-muted/50 rounded-lg border border-border">
                                <h3 className="font-semibold mb-3 text-foreground">Your Account Info</h3>
                                <div className="grid md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Name:</span>
                                        <p className="font-medium text-foreground">{auth.user?.name}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Email:</span>
                                        <p className="font-medium text-foreground">{auth.user?.email}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Role:</span>
                                        <p className="font-medium text-foreground capitalize">{auth.user?.role}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

