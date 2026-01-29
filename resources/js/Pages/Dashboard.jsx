import { Head, Link, usePage } from '@inertiajs/react';
import DarkModeToggle from '@/Components/DarkModeToggle';
import { Calendar, User } from 'lucide-react';

export default function Dashboard() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Dashboard" />

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
                                <span className="text-sm font-medium text-foreground px-2.5 py-1.5 rounded bg-muted/50">
                                    Dashboard
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

                <div className="py-12">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-card border-2 border-border rounded-2xl p-10 shadow-2xl backdrop-blur-sm">
                            <div className="mb-8">
                                <h2 className="text-4xl font-bold mb-3 text-primary">
                                    Welcome back, {auth.user?.name}!
                                </h2>
                                <p className="text-muted-foreground text-lg">
                                    Manage your team's capacity and project allocations with ease.
                                </p>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-6 mb-8">
                                <Link
                                    href={route('calendar')}
                                    className="group relative p-8 bg-primary/10 border-2 border-primary/30 rounded-2xl hover:border-primary/60 transition-all duration-300 hover:shadow-2xl hover:scale-[1.03] overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="p-3 bg-primary rounded-xl shadow-lg">
                                                <Calendar className="h-8 w-8 text-primary-foreground" />
                                            </div>
                                            <span className="text-primary text-3xl group-hover:translate-x-2 transition-transform duration-300">→</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-foreground mb-2">Calendar View</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            View and manage project allocations, annual leave, and calendar markers
                                        </p>
                                    </div>
                                </Link>
                            </div>
                            
                            <div className="p-8 bg-muted/50 rounded-xl border-2 border-border shadow-inner backdrop-blur-sm">
                                <h3 className="font-bold mb-5 text-foreground text-lg flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    Your Account Info
                                </h3>
                                <div className="grid md:grid-cols-3 gap-6 text-sm">
                                    <div className="p-4 bg-background/50 rounded-lg border border-border shadow-sm">
                                        <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">Name</span>
                                        <p className="font-bold text-foreground text-lg mt-1">{auth.user?.name}</p>
                                    </div>
                                    <div className="p-4 bg-background/50 rounded-lg border border-border shadow-sm">
                                        <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">Email</span>
                                        <p className="font-bold text-foreground text-lg mt-1 truncate">{auth.user?.email}</p>
                                    </div>
                                    <div className="p-4 bg-background/50 rounded-lg border border-border shadow-sm">
                                        <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">Role</span>
                                        <p className="font-bold text-foreground text-lg mt-1 capitalize">{auth.user?.role}</p>
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

