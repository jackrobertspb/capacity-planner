import { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subWeeks, subMonths, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import DarkModeToggle from '@/Components/DarkModeToggle';
import CalendarHeader from '@/Components/Calendar/CalendarHeader';
import CalendarGrid from '@/Components/Calendar/CalendarGrid';
import AllocationForm from '@/Components/Allocation/AllocationForm';
import CalendarMarkerForm from '@/Components/Calendar/CalendarMarkerForm';

export default function Calendar({ startDate, endDate, users, projects, allocations: serverAllocations, annualLeave, markers }) {
    const { auth } = usePage().props;
    const [view, setView] = useState('month'); // 'day', 'week', 'month'
    const [viewMode, setViewMode] = useState('people'); // 'people' or 'project'
    const [currentDate, setCurrentDate] = useState(parseISO(startDate));
    const [allocations, setAllocations] = useState(serverAllocations);
    const [showAllocationForm, setShowAllocationForm] = useState(false);
    const [editingAllocation, setEditingAllocation] = useState(null);
    const [allocationDate, setAllocationDate] = useState(null);
    const [allocationUserId, setAllocationUserId] = useState(null);
    const [showMarkerForm, setShowMarkerForm] = useState(false);
    const [editingMarker, setEditingMarker] = useState(null);
    const [markerDate, setMarkerDate] = useState(null);

    // Sync allocations when server data changes (e.g., navigation, external updates)
    useEffect(() => {
        setAllocations(serverAllocations);
    }, [serverAllocations]);

    const navigateDate = (direction) => {
        let newDate;
        if (view === 'day') {
            newDate = direction === 'next' ? addDays(currentDate, 1) : addDays(currentDate, -1);
        } else if (view === 'week') {
            newDate = direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
        } else {
            newDate = direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
        }
        setCurrentDate(newDate);
        updateCalendarRange(newDate);
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        updateCalendarRange(today);
    };

    const handleClearAllLeave = async () => {
        if (!confirm('Are you sure you want to delete ALL leave entries? This cannot be undone.')) {
            return;
        }

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
            const response = await fetch('/annual-leave/clear-all', {
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });

            if (response.ok) {
                router.reload({ only: ['annualLeave'], preserveScroll: true });
            } else {
                alert('Failed to clear leave entries');
            }
        } catch (error) {
            console.error('Error clearing leave:', error);
            alert('Error clearing leave entries');
        }
    };

    const updateCalendarRange = (date, viewType = null) => {
        // Use provided viewType or fall back to current view state
        const effectiveView = viewType || view;
        let newStartDate, newEndDate;

        if (effectiveView === 'day') {
            newStartDate = format(date, 'yyyy-MM-dd');
            newEndDate = format(date, 'yyyy-MM-dd');
        } else if (effectiveView === 'week') {
            newStartDate = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            newEndDate = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        } else {
            // For month view, get the full calendar grid including padding days
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);
            const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
            newStartDate = format(weekStart, 'yyyy-MM-dd');
            newEndDate = format(weekEnd, 'yyyy-MM-dd');
        }

        router.get(route('calendar'), {
            start_date: newStartDate,
            end_date: newEndDate,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleViewChange = (newView) => {
        setView(newView);
        updateCalendarRange(currentDate, newView);
    };

    const dateRange = {
        start: parseISO(startDate),
        end: parseISO(endDate),
    };

    const handleAddAllocation = (startDate, userId, endDate = null) => {
        console.log('handleAddAllocation called', { startDate, endDate, userId, users, projects });
        try {
            setAllocationDate(startDate);
            setAllocationUserId(userId);
            setEditingAllocation({
                start_date: startDate,
                end_date: endDate || startDate,
                user_id: userId,
                type: 'project',
                days_per_week: 5.0,
            });
            setShowAllocationForm(true);
            console.log('Form should now be visible');
        } catch (error) {
            console.error('Error in handleAddAllocation:', error);
        }
    };

    const handleEditAllocation = (allocation) => {
        setEditingAllocation(allocation);
        setAllocationDate(null);
        setAllocationUserId(null);
        setShowAllocationForm(true);
    };

    const handleDeleteAllocation = async (allocationId) => {
        try {
            router.delete(`/allocations/${allocationId}`, {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['allocations'] });
                },
            });
        } catch (error) {
            console.error('Error deleting allocation:', error);
        }
    };

    const handleSaveAllocation = (newAllocation) => {
        if (newAllocation) {
            // Optimistically update the UI immediately
            if (editingAllocation?.id) {
                // Update existing allocation
                setAllocations(prev => prev.map(a =>
                    a.id === newAllocation.id ? newAllocation : a
                ));
            } else {
                // Add new allocation
                setAllocations(prev => [...prev, newAllocation]);
            }
        }

        // Refresh in background to ensure consistency
        router.reload({ only: ['allocations'], preserveScroll: true });
    };

    const handleAddMarker = (date) => {
        setMarkerDate(date);
        setEditingMarker(null);
        setShowMarkerForm(true);
    };

    const handleEditMarker = (marker) => {
        setEditingMarker(marker);
        setMarkerDate(null);
        setShowMarkerForm(true);
    };

    const handleDeleteMarker = async (markerId) => {
        try {
            router.delete(`/markers/${markerId}`, {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['markers'] });
                },
            });
        } catch (error) {
            console.error('Error deleting marker:', error);
        }
    };

    const handleSaveMarker = () => {
        router.reload({ only: ['markers'] });
    };

    return (
        <>
            <Head title="Calendar" />

            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
                <nav className="bg-card/80 backdrop-blur-sm border-b border-border shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex items-center gap-6">
                                <h1 className="text-xl font-bold text-primary">
                                    🚀 CAPACITY PLANNER - TEST UPDATE WORKING! 🚀
                                </h1>
                                <Link
                                    href={route('dashboard')}
                                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                                >
                                    Dashboard
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

                <div className="py-6">
                    <div className="px-4 sm:px-6 lg:px-8">
                        <CalendarHeader
                            currentDate={currentDate}
                            view={view}
                            viewMode={viewMode}
                            onViewChange={handleViewChange}
                            onViewModeChange={setViewMode}
                            onNavigate={navigateDate}
                            onToday={goToToday}
                            onClearAllLeave={handleClearAllLeave}
                        />
                    </div>
                    
                    <div className="mt-6 bg-card border-t border-b border-border">
                        <CalendarGrid
                                view={view}
                                viewMode={viewMode}
                                currentDate={currentDate}
                                dateRange={dateRange}
                                users={users}
                                projects={projects}
                                allocations={allocations}
                                annualLeave={annualLeave}
                                markers={markers}
                                onAddAllocation={handleAddAllocation}
                                onEditAllocation={handleEditAllocation}
                                onDeleteAllocation={handleDeleteAllocation}
                                onAddMarker={handleAddMarker}
                                onEditMarker={handleEditMarker}
                                onDeleteMarker={handleDeleteMarker}
                            />
                    </div>
                </div>
            </div>

            {showAllocationForm && users && projects && (
                <AllocationForm
                    allocation={editingAllocation}
                    users={users}
                    projects={projects}
                    onClose={() => {
                        setShowAllocationForm(false);
                        setEditingAllocation(null);
                        setAllocationDate(null);
                        setAllocationUserId(null);
                    }}
                    onSave={handleSaveAllocation}
                />
            )}

            {showMarkerForm && (
                <CalendarMarkerForm
                    marker={editingMarker}
                    date={markerDate}
                    onClose={() => {
                        setShowMarkerForm(false);
                        setEditingMarker(null);
                        setMarkerDate(null);
                    }}
                    onSave={handleSaveMarker}
                />
            )}
        </>
    );
}

