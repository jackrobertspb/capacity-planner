import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { Plus, FolderPlus, X, UserPlus } from 'lucide-react';
import DarkModeToggle from '@/Components/DarkModeToggle';
import CalendarHeader from '@/Components/Calendar/CalendarHeader';
import CalendarGrid from '@/Components/Calendar/CalendarGrid';
import AllocationForm from '@/Components/Allocation/AllocationForm';
import CalendarMarkerForm from '@/Components/Calendar/CalendarMarkerForm';
import AddEmployeeModal from '@/Components/Employee/AddEmployeeModal';

export default function Calendar({ startDate, endDate, employees, projects, allocations, annualLeave, markers, assignments }) {
    const { auth } = usePage().props;
    const view = 'month'; // Fixed to month view only
    const [viewMode, setViewMode] = useState('people'); // 'people' or 'project'
    const [sortMode, setSortMode] = useState('manual'); // 'manual' or 'name'
    const [isCompressed, setIsCompressed] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date()); // Start with today's date
    const [showAllocationForm, setShowAllocationForm] = useState(false);
    const [editingAllocation, setEditingAllocation] = useState(null);
    const [allocationDate, setAllocationDate] = useState(null);
    const [allocationUserId, setAllocationUserId] = useState(null);
    const [showMarkerForm, setShowMarkerForm] = useState(false);
    const [editingMarker, setEditingMarker] = useState(null);
    const [markerDate, setMarkerDate] = useState(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showAddProjectModal, setShowAddProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectStatus, setNewProjectStatus] = useState('to_do');
    const [newProjectColor, setNewProjectColor] = useState('#64748b');
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const addMenuRef = useRef(null);

    // Add employee modal state
    const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);

    // Optimistic UI state - immediately show new allocations/leave before server confirms
    const [optimisticAllocations, setOptimisticAllocations] = useState([]);
    const [optimisticAnnualLeave, setOptimisticAnnualLeave] = useState([]);
    const [deletedAllocationIds, setDeletedAllocationIds] = useState(new Set());

    // Infinite scroll state
    const [loadedStartDate, setLoadedStartDate] = useState(parseISO(startDate));
    const [loadedEndDate, setLoadedEndDate] = useState(parseISO(endDate));
    const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
    const [isLoadingNext, setIsLoadingNext] = useState(false);
    const scrollContainerRef = useRef(null);
    const lastScrollLeft = useRef(0); // Track last scroll position
    const hasInitiallyScrolled = useRef(false); // Track if we've done the initial scroll

    // Sync loaded dates with props when they change
    useEffect(() => {
        setLoadedStartDate(parseISO(startDate));
        setLoadedEndDate(parseISO(endDate));
        // Note: Don't reset lastScrollLeft here - it's managed by the scroll handlers
        // and the initial scroll effect. Resetting it here breaks infinite scroll.
    }, [startDate, endDate]);

    // Clear optimistic allocations with real IDs when server data refreshes
    // This ensures updated project names/colors are reflected after edits
    // Use a stable key based on allocation data to avoid unnecessary runs
    const allocationsKey = useMemo(() =>
        allocations.map(a => `${a.id}:${a.project?.name}:${a.project?.color}`).join(','),
        [allocations]
    );
    useEffect(() => {
        setOptimisticAllocations(prev => prev.filter(a => a._isTemporary));
        setDeletedAllocationIds(new Set());
    }, [allocationsKey]);

    // Scroll to current month on initial load
    useEffect(() => {
        if (hasInitiallyScrolled.current) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        // Wait for the DOM to be fully rendered
        requestAnimationFrame(() => {
            const today = new Date();
            const currentMonthStart = startOfMonth(today);
            const loadedStart = parseISO(startDate);

            // Calculate days from loaded start to current month start
            const daysToCurrentMonth = differenceInDays(currentMonthStart, loadedStart);

            if (daysToCurrentMonth > 0) {
                // Each day column is 60px wide
                const scrollPosition = daysToCurrentMonth * 60;
                container.scrollLeft = scrollPosition;
                lastScrollLeft.current = scrollPosition;
            }

            hasInitiallyScrolled.current = true;
        });
    }, [startDate]);

    // Merge optimistic data with server data
    // For allocations, prefer optimistic versions (for edits) over server versions
    // Also filter out deleted allocations
    const displayAllocations = (() => {
        const optimisticIds = new Set(optimisticAllocations.map(a => a.id).filter(Boolean));
        const serverAllocations = allocations.filter(a =>
            !optimisticIds.has(a.id) && !deletedAllocationIds.has(a.id)
        );
        const filteredOptimistic = optimisticAllocations.filter(a => !deletedAllocationIds.has(a.id));
        return [...serverAllocations, ...filteredOptimistic];
    })();
    const displayAnnualLeave = (() => {
        // Filter out server entries that match optimistic entries by user+dates
        // This handles the case where server data arrives while we still have temp entries
        const serverLeave = annualLeave.filter(serverEntry => {
            // Check if any optimistic entry matches this server entry
            const hasMatchingOptimistic = optimisticAnnualLeave.some(optEntry =>
                optEntry.user_id === serverEntry.user_id &&
                optEntry.start_date === serverEntry.start_date &&
                optEntry.end_date === serverEntry.end_date
            );
            return !hasMatchingOptimistic;
        });
        return [...serverLeave, ...optimisticAnnualLeave];
    })();

    // Handler to remove a temporary optimistic leave entry on error
    const handleRemoveOptimisticLeave = (tempId) => {
        setOptimisticAnnualLeave(prev => prev.filter(l => l.id !== tempId));
    };


    useEffect(() => {
        // When server annualLeave updates, clean up any temp optimistic entries
        // that now have matching real entries (same user+dates)
        if (annualLeave?.length > 0 && optimisticAnnualLeave.length > 0) {
            const tempEntriesToRemove = optimisticAnnualLeave.filter(optEntry => {
                if (!optEntry._isTemporary) return false;
                // Check if server now has this entry
                return annualLeave.some(serverEntry =>
                    serverEntry.user_id === optEntry.user_id &&
                    serverEntry.start_date === optEntry.start_date &&
                    serverEntry.end_date === optEntry.end_date
                );
            });
            if (tempEntriesToRemove.length > 0) {
                setOptimisticAnnualLeave(prev =>
                    prev.filter(entry => !tempEntriesToRemove.some(t => t.id === entry.id))
                );
            }
        }
    }, [annualLeave]);

    const goToToday = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const today = new Date();
        const loadedStart = parseISO(startDate);
        const loadedEnd = parseISO(endDate);

        // Check if today is within the loaded date range
        if (today >= loadedStart && today <= loadedEnd) {
            // Calculate days from loaded start to today
            const daysToToday = differenceInDays(today, loadedStart);
            // Each day column is 60px wide, sidebar is 275px + 2px border
            // Center today in the viewport
            const viewportWidth = container.clientWidth;
            const todayPosition = 275 + 2 + (daysToToday * 60) + 30; // +30 to center of column
            const scrollPosition = todayPosition - (viewportWidth / 2);
            container.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
        } else {
            // Today is outside loaded range, reload to get fresh data
            window.location.href = route('calendar');
        }
    };

    // Scroll the calendar left by approximately one month (30 days * 60px)
    const scrollLeft = () => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const scrollAmount = 30 * 60; // 30 days worth of columns
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    };

    // Scroll the calendar right by approximately one month (30 days * 60px)
    const scrollRight = () => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const scrollAmount = 30 * 60; // 30 days worth of columns
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    };

    // Infinite scroll: Load previous date range
    const loadPreviousRange = useCallback(() => {
        if (isLoadingPrevious) return;
        setIsLoadingPrevious(true);

        // Load 30 days before current start
        const newStartDate = format(subMonths(loadedStartDate, 1), 'yyyy-MM-dd');

        // Store scroll position before fetch
        const container = scrollContainerRef.current;
        if (!container) {
            setIsLoadingPrevious(false);
            return;
        }
        const prevScrollWidth = container.scrollWidth;
        const prevScrollLeft = container.scrollLeft;

        router.get(route('calendar'), {
            start_date: newStartDate,
            end_date: format(loadedEndDate, 'yyyy-MM-dd'),
        }, {
            preserveState: true,
            preserveScroll: false,
            onSuccess: () => {
                // CRITICAL: Restore scroll position after prepending content
                // Use fresh ref to get the new container after Inertia re-renders
                requestAnimationFrame(() => {
                    const currentContainer = scrollContainerRef.current;
                    if (currentContainer) {
                        const newScrollWidth = currentContainer.scrollWidth;
                        const addedWidth = newScrollWidth - prevScrollWidth;
                        currentContainer.scrollLeft = prevScrollLeft + addedWidth;
                        // Update lastScrollLeft to the restored position
                        lastScrollLeft.current = prevScrollLeft + addedWidth;
                    }
                });

                setIsLoadingPrevious(false);
            },
            onError: () => setIsLoadingPrevious(false),
        });
    }, [loadedStartDate, loadedEndDate, isLoadingPrevious]);

    // Infinite scroll: Load next date range
    const loadNextRange = useCallback(() => {
        if (isLoadingNext) return;
        setIsLoadingNext(true);

        // Load 30 days after current end
        const newEndDate = format(addMonths(loadedEndDate, 1), 'yyyy-MM-dd');

        // Store current scroll position
        const currentScrollLeft = scrollContainerRef.current?.scrollLeft || 0;

        router.get(route('calendar'), {
            start_date: format(loadedStartDate, 'yyyy-MM-dd'),
            end_date: newEndDate,
        }, {
            preserveState: true,
            preserveScroll: true, // Keep scroll position when appending
            onSuccess: () => {
                // Update lastScrollLeft to prevent re-triggering scroll handler
                requestAnimationFrame(() => {
                    const currentContainer = scrollContainerRef.current;
                    if (currentContainer) {
                        // Restore scroll position in case it shifted
                        currentContainer.scrollLeft = currentScrollLeft;
                        lastScrollLeft.current = currentScrollLeft;
                    }
                });
                setIsLoadingNext(false);
            },
            onError: () => setIsLoadingNext(false),
        });
    }, [loadedStartDate, loadedEndDate, isLoadingNext]);

    // Scroll detection effect - only for month view
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || view !== 'month') return;

        let timeoutId = null;
        const handleScroll = () => {
            const currentScrollLeft = container.scrollLeft;

            // Only trigger if scroll position actually changed (user scrolled)
            if (Math.abs(currentScrollLeft - lastScrollLeft.current) < 5) {
                return; // Ignore tiny movements or no movement
            }

            lastScrollLeft.current = currentScrollLeft;

            if (timeoutId) clearTimeout(timeoutId);

            timeoutId = setTimeout(() => {
                const scrollLeft = container.scrollLeft;
                const scrollWidth = container.scrollWidth;
                const clientWidth = container.clientWidth;

                const THRESHOLD = 300; // pixels from edge

                // Near left edge - load previous month
                if (scrollLeft < THRESHOLD && !isLoadingPrevious) {
                    loadPreviousRange();
                }

                // Near right edge - load next month
                if (scrollLeft + clientWidth > scrollWidth - THRESHOLD && !isLoadingNext) {
                    loadNextRange();
                }
            }, 150);
        };

        container.addEventListener('scroll', handleScroll);
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            container.removeEventListener('scroll', handleScroll);
        };
    }, [view, isLoadingPrevious, isLoadingNext, loadPreviousRange, loadNextRange]);

    const dateRange = {
        start: parseISO(startDate),
        end: parseISO(endDate),
    };

    const handleAddAllocation = (startDate, employeeId, projectIdOrEndDate = null, endDate = null) => {
        // Handle both old signature (startDate, employeeId, endDate) and new (startDate, employeeId, projectId)
        // If projectIdOrEndDate is a number, it's a project ID; if it's a string date, it's endDate
        let projectId = null;
        let actualEndDate = endDate;

        if (typeof projectIdOrEndDate === 'number') {
            projectId = projectIdOrEndDate;
        } else if (projectIdOrEndDate && typeof projectIdOrEndDate === 'string') {
            // Check if it looks like a date
            if (projectIdOrEndDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                actualEndDate = projectIdOrEndDate;
            }
        }

        // console.log('handleAddAllocation called', { startDate, actualEndDate, employeeId, projectId, employees, projects });
        try {
            setAllocationDate(startDate);
            setAllocationUserId(employeeId);

            // Find the project if projectId is provided
            const selectedProject = projectId ? projects.find(p => p.id === projectId) : null;

            const newAllocation = {
                start_date: startDate,
                end_date: actualEndDate || startDate,
                employee_id: employeeId,
                project_id: projectId,
                type: 'project',
                days_per_week: 5.0,
                title: selectedProject ? selectedProject.name : 'New allocation',
                // Add temporary ID so we can identify and replace it later
                id: `temp-${Date.now()}`,
                _isTemporary: true,
                // Add a placeholder project object for display
                project: selectedProject || {
                    name: 'New allocation',
                    color: '#8b5cf6',
                },
            };

            setEditingAllocation(newAllocation);

            // Immediately add to optimistic state so it appears in UI
            // console.log('✨ [Calendar] Adding temporary allocation to optimistic state');
            setOptimisticAllocations(prev => [...prev, newAllocation]);

            setShowAllocationForm(true);
            // console.log('Form should now be visible with allocation in UI');
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
            // Optimistically mark as deleted - it will be filtered out in display
            // console.log('🗑️ [Calendar] Optimistically marking allocation as deleted:', allocationId);
            setDeletedAllocationIds(prev => new Set([...prev, allocationId]));

            // Make the delete API call
            router.delete(`/allocations/${allocationId}`, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    // console.log('✅ [Calendar] Allocation deleted successfully');
                    // No need to reload - optimistic update already handled it
                },
                onError: (errors) => {
                    console.error('❌ [Calendar] Error deleting allocation:', errors);
                    // On error, remove from deleted set to restore the allocation
                    setDeletedAllocationIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(allocationId);
                        return newSet;
                    });
                },
            });
        } catch (error) {
            console.error('Error deleting allocation:', error);
        }
    };

    const handleSaveAllocation = (savedData, isEdit = false) => {
        // console.log('🟢 [Calendar] handleSaveAllocation called', { savedData, isEdit });

        if (savedData) {
            if (isEdit) {
                // Update existing allocation - replace in optimistic state
                // console.log('✨ [Calendar] Updating allocation in optimistic state');
                setOptimisticAllocations(prev => {
                    // Remove both the real ID and any temporary versions
                    const filtered = prev.filter(a =>
                        a.id !== savedData.id && !a._isTemporary
                    );
                    return [...filtered, savedData];
                });
            } else {
                // Replace temporary allocation with real one from API
                // console.log('✨ [Calendar] Replacing temporary allocation with real one');
                setOptimisticAllocations(prev => {
                    // Remove temporary allocation and add the real one
                    const filtered = prev.filter(a => !a._isTemporary);
                    return [...filtered, savedData];
                });
            }
        }

        // Close form immediately - allocation is visible via optimistic state
        setShowAllocationForm(false);
        setEditingAllocation(null);
        setAllocationDate(null);
        setAllocationUserId(null);
        // console.log('🟢 [Calendar] Form closed, allocation visible in UI');
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
                preserveState: true,
                onSuccess: () => {
                    // Reload all calendar data atomically to prevent flickering
                    router.reload({
                        only: ['allocations', 'annualLeave', 'markers'],
                        preserveScroll: true,
                        preserveState: true,
                    });
                },
            });
        } catch (error) {
            console.error('Error deleting marker:', error);
        }
    };

    const handleSaveMarker = () => {
        // Reload all calendar data atomically to prevent flickering
        // Form stays open with "Saving..." state until this completes
        router.reload({
            only: ['allocations', 'annualLeave', 'markers'],
            preserveScroll: true,
            onFinish: () => {
                // Close the form only after reload is completely finished and new data is rendered
                setShowMarkerForm(false);
                setEditingMarker(null);
                setMarkerDate(null);
            },
        });
    };

    // Close add menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
                setShowAddMenu(false);
            }
        };

        if (showAddMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showAddMenu]);

    return (
        <>
            <Head title="Calendar" />

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
                            </div>

                            {/* Calendar Navigation - Centered */}
                            {employees.length > 0 && (
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <CalendarHeader
                                        currentDate={currentDate}
                                        onToday={goToToday}
                                        onScrollLeft={scrollLeft}
                                        onScrollRight={scrollRight}
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-muted-foreground">{auth.user?.name}</span>
                                <Link
                                    href={route('profile.edit')}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded hover:bg-muted/50"
                                >
                                    Profile
                                </Link>
                                <DarkModeToggle />

                                {/* Add Menu */}
                                <div className="relative" ref={addMenuRef}>
                                    <button
                                        onClick={() => setShowAddMenu(!showAddMenu)}
                                        className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
                                        title="Add"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>

                                    {showAddMenu && (
                                        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                                            <Link
                                                href={route('projects')}
                                                className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3 cursor-pointer"
                                                onClick={() => setShowAddMenu(false)}
                                            >
                                                <FolderPlus className="h-4 w-4" />
                                                <span>Add project</span>
                                            </Link>
                                            {auth.user?.role === 'admin' && (
                                                <Link
                                                    href={route('users.index')}
                                                    className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3 cursor-pointer"
                                                    onClick={() => setShowAddMenu(false)}
                                                >
                                                    <UserPlus className="h-4 w-4" />
                                                    <span>Add employees</span>
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>

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

                <div className="flex flex-col h-[calc(100vh-56px)]">
                    <div className="flex-1" style={{ minWidth: 0 }}>
                        <CalendarGrid
                                ref={scrollContainerRef}
                                view={view}
                                viewMode={viewMode}
                                sortMode={sortMode}
                                isCompressed={isCompressed}
                                currentDate={currentDate}
                                dateRange={dateRange}
                                employees={employees}
                                projects={projects}
                                allocations={displayAllocations}
                                annualLeave={displayAnnualLeave}
                                markers={markers}
                                assignments={assignments || []}
                                onAddAllocation={handleAddAllocation}
                                onEditAllocation={handleEditAllocation}
                                onDeleteAllocation={handleDeleteAllocation}
                                onAddMarker={handleAddMarker}
                                onEditMarker={handleEditMarker}
                                onDeleteMarker={handleDeleteMarker}
                                onAddProject={() => setShowAddProjectModal(true)}
                                onAddPerson={() => setShowAddEmployeeModal(true)}
                                onOptimisticAllocation={(data) => setOptimisticAllocations(prev => [...prev, data])}
                                onOptimisticLeave={(data) => setOptimisticAnnualLeave(prev => [...prev, data])}
                                onRemoveOptimisticLeave={handleRemoveOptimisticLeave}
                                auth={auth}
                                onViewModeChange={setViewMode}
                                onSortModeChange={setSortMode}
                                onToggleCompress={() => setIsCompressed(!isCompressed)}
                                isLoadingPrevious={isLoadingPrevious}
                                isLoadingNext={isLoadingNext}
                            />
                    </div>
                </div>

            </div>

            {showAllocationForm && employees && projects && (
                <AllocationForm
                    allocation={editingAllocation}
                    employees={employees}
                    projects={projects}
                    onClose={() => {
                        // Remove temporary allocation if user cancels
                        // console.log('🚫 [Calendar] Form cancelled, removing temporary allocation');
                        setOptimisticAllocations(prev => prev.filter(a => !a._isTemporary));
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

            {/* Add Project Modal */}
            {showAddProjectModal && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
                        onClick={() => setShowAddProjectModal(false)}
                    />

                    {/* Modal */}
                    <div
                        className="fixed z-50 w-full max-w-md rounded-lg shadow-2xl bg-card"
                        style={{
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="text-xl font-semibold text-foreground">Add new project</h2>
                            <button
                                onClick={() => setShowAddProjectModal(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {/* Project name */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Project name<span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g My project"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full px-3 py-2 text-foreground bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Status
                                </label>
                                <select
                                    value={newProjectStatus}
                                    onChange={(e) => setNewProjectStatus(e.target.value)}
                                    className="w-full px-3 py-2 text-foreground bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                >
                                    <option value="to_do">To do</option>
                                    <option value="in_progress">In progress</option>
                                    <option value="done">Done</option>
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">Auto-update disabled</p>
                            </div>

                            {/* Choose a color */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Choose a color
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        '#64748b', // slate
                                        '#ef4444', // red
                                        '#f97316', // orange
                                        '#84cc16', // lime
                                        '#14b8a6', // teal
                                        '#06b6d4', // cyan
                                        '#3b82f6', // blue
                                        '#8b5cf6', // violet
                                        '#a855f7', // purple
                                        '#ec4899', // pink
                                    ].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setNewProjectColor(color)}
                                            className="w-10 h-10 rounded-md relative flex items-center justify-center cursor-pointer"
                                            style={{ backgroundColor: color }}
                                        >
                                            {newProjectColor === color && (
                                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                            <button
                                onClick={() => setShowAddProjectModal(false)}
                                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!newProjectName.trim() || isCreatingProject) return;

                                    setIsCreatingProject(true);
                                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

                                    try {
                                        const response = await fetch('/projects', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'X-Requested-With': 'XMLHttpRequest',
                                                'Accept': 'application/json',
                                                'X-CSRF-TOKEN': csrfToken,
                                            },
                                            body: JSON.stringify({
                                                name: newProjectName,
                                                color: newProjectColor,
                                                status: newProjectStatus,
                                                is_visible: true,
                                            }),
                                        });

                                        if (response.ok) {
                                            router.reload({
                                                only: ['projects', 'allocations'],
                                                preserveScroll: true,
                                                preserveState: true,
                                                onFinish: () => {
                                                    setIsCreatingProject(false);
                                                }
                                            });
                                            setShowAddProjectModal(false);
                                            setNewProjectName('');
                                            setNewProjectStatus('to_do');
                                            setNewProjectColor('#64748b');
                                        } else {
                                            setIsCreatingProject(false);
                                        }
                                    } catch (error) {
                                        console.error('Error creating project:', error);
                                        setIsCreatingProject(false);
                                    }
                                }}
                                disabled={!newProjectName.trim() || isCreatingProject}
                                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {isCreatingProject ? 'Creating...' : 'Add new project'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Add Employee Modal */}
            {showAddEmployeeModal && (
                <AddEmployeeModal onClose={() => setShowAddEmployeeModal(false)} />
            )}
        </>
    );
}

