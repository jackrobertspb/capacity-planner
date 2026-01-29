<x-filament-panels::page>
    <div class="grid gap-6 mb-6 md:grid-cols-2 lg:grid-cols-3">
        {{-- Quick Stats Cards --}}
        <div class="fi-section rounded-xl p-6">
            <div class="flex items-center gap-4">
                <div class="flex-shrink-0">
                    <svg class="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <div class="flex-1">
                    <h3 class="text-sm font-medium text-muted-foreground">Total Employees</h3>
                    <p class="text-3xl font-bold text-foreground mt-1">{{ \App\Models\User::where('is_visible', true)->count() }}</p>
                </div>
            </div>
        </div>

        <div class="fi-section rounded-xl p-6">
            <div class="flex items-center gap-4">
                <div class="flex-shrink-0">
                    <svg class="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div class="flex-1">
                    <h3 class="text-sm font-medium text-muted-foreground">Active Projects</h3>
                    <p class="text-3xl font-bold text-foreground mt-1">{{ \App\Models\Project::where('is_visible', true)->count() }}</p>
                </div>
            </div>
        </div>

        <div class="fi-section rounded-xl p-6">
            <div class="flex items-center gap-4">
                <div class="flex-shrink-0">
                    <svg class="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <div class="flex-1">
                    <h3 class="text-sm font-medium text-muted-foreground">Active Allocations</h3>
                    <p class="text-3xl font-bold text-foreground mt-1">{{ \App\Models\ProjectAllocation::count() }}</p>
                </div>
            </div>
        </div>
    </div>

    {{-- Quick Actions --}}
    <div class="grid gap-6 mb-6 md:grid-cols-2">
        <div class="fi-section rounded-xl p-6">
            <h2 class="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div class="space-y-3">
                <a href="{{ route('filament.admin.resources.users.create') }}" class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                    <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span class="font-medium text-foreground">Add New Employee</span>
                </a>
                <a href="{{ route('filament.admin.resources.projects.create') }}" class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                    <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span class="font-medium text-foreground">Create New Project</span>
                </a>
                <a href="{{ route('filament.admin.resources.annual-leaves.create') }}" class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                    <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span class="font-medium text-foreground">Add Annual Leave</span>
                </a>
                <a href="{{ route('calendar') }}" class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                    <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span class="font-medium text-foreground">View Calendar</span>
                </a>
            </div>
        </div>

        <div class="fi-section rounded-xl p-6">
            <h2 class="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
            <div class="space-y-3">
                @php
                    $recentAllocations = \App\Models\ProjectAllocation::with(['user', 'project'])
                        ->latest()
                        ->take(5)
                        ->get();
                @endphp

                @forelse($recentAllocations as $allocation)
                    <div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div class="flex-shrink-0 mt-1">
                            <div class="w-2 h-2 rounded-full bg-primary"></div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-foreground truncate">
                                {{ $allocation->user?->name ?? 'Unknown User' }}
                            </p>
                            <p class="text-xs text-muted-foreground truncate">
                                Allocated to {{ $allocation->project?->name ?? $allocation->title }}
                            </p>
                            <p class="text-xs text-muted-foreground mt-1">
                                {{ $allocation->created_at->diffForHumans() }}
                            </p>
                        </div>
                    </div>
                @empty
                    <p class="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
                @endforelse
            </div>
        </div>
    </div>

    {{-- Welcome Message --}}
    <div>
        <div class="fi-section rounded-xl p-6" style="background: hsl(var(--primary) / 0.1) !important; border-color: hsl(var(--primary) / 0.2) !important;">
            <div class="flex items-start gap-4">
                <div class="flex-shrink-0">
                    <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div class="flex-1">
                    <h3 class="text-lg font-semibold text-foreground mb-2">Welcome to Capacity Planner Admin</h3>
                    <p class="text-sm text-muted-foreground">
                        Manage your team's resources, projects, and schedules from this dashboard.
                        Use the navigation menu on the left to access different sections, or use the quick actions above to get started.
                    </p>
                </div>
            </div>
        </div>
    </div>
</x-filament-panels::page>
