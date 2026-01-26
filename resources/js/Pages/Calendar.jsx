import { useState, useRef, useEffect, useCallback } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { Plus, FolderPlus, X, UserPlus, Copy, Check } from 'lucide-react';
import DarkModeToggle from '@/Components/DarkModeToggle';
import CalendarHeader from '@/Components/Calendar/CalendarHeader';
import CalendarGrid from '@/Components/Calendar/CalendarGrid';
import AllocationForm from '@/Components/Allocation/AllocationForm';
import CalendarMarkerForm from '@/Components/Calendar/CalendarMarkerForm';

export default function Calendar({ startDate, endDate, employees, projects, allocations, annualLeave, markers }) {
    console.log('🔄 [Calendar] Component rendering with:', {
        employees: employees?.length,
        allocations: allocations?.length,
        annualLeave: annualLeave?.length,
        markers: markers?.length,
        timestamp: new Date().toISOString()
    });

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

    // Invite user modal state
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteFirstName, setInviteFirstName] = useState('');
    const [inviteLastName, setInviteLastName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('user');
    const [isCreatingInvite, setIsCreatingInvite] = useState(false);
    const [inviteUrl, setInviteUrl] = useState('');
    const [inviteErrors, setInviteErrors] = useState({});
    const [copied, setCopied] = useState(false);
    const addMenuRef = useRef(null);

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

    // Sync loaded dates with props when they change
    useEffect(() => {
        setLoadedStartDate(parseISO(startDate));
        setLoadedEndDate(parseISO(endDate));
        // Reset scroll position tracking when date range changes
        lastScrollLeft.current = 0;
    }, [startDate, endDate]);

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

    // Debug: Log when allocations/leave data changes
    useEffect(() => {
        console.log('📊 [Calendar] Allocations prop updated:', {
            count: allocations?.length,
            ids: allocations?.map(a => a.id),
            timestamp: new Date().toISOString()
        });
        // Note: We don't clear optimistic data here anymore to prevent flicker
        // It's cleared in onFinish callbacks after form closes
    }, [allocations]);

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

    // Debug: Track form visibility
    useEffect(() => {
        console.log('👁️ [Calendar] Allocation form visibility changed:', {
            visible: showAllocationForm,
            timestamp: new Date().toISOString()
        });
    }, [showAllocationForm]);

    const goToToday = () => {
        // Full page reload to calendar without any query params
        // This ensures we get fresh data for current month only
        window.location.href = route('calendar');
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
                requestAnimationFrame(() => {
                    if (container) {
                        const newScrollWidth = container.scrollWidth;
                        const addedWidth = newScrollWidth - prevScrollWidth;
                        container.scrollLeft = prevScrollLeft + addedWidth;
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

        router.get(route('calendar'), {
            start_date: format(loadedStartDate, 'yyyy-MM-dd'),
            end_date: newEndDate,
        }, {
            preserveState: true,
            preserveScroll: true, // Keep scroll position when appending
            onSuccess: () => {
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

    const handleAddAllocation = (startDate, employeeId, endDate = null) => {
        console.log('handleAddAllocation called', { startDate, endDate, employeeId, employees, projects });
        try {
            setAllocationDate(startDate);
            setAllocationUserId(employeeId);

            const newAllocation = {
                start_date: startDate,
                end_date: endDate || startDate,
                employee_id: employeeId,
                type: 'project',
                days_per_week: 5.0,
                title: 'New allocation',
                // Add temporary ID so we can identify and replace it later
                id: `temp-${Date.now()}`,
                _isTemporary: true,
                // Add a placeholder project object for display
                project: {
                    name: 'New allocation',
                    color: '#8b5cf6',
                },
            };

            setEditingAllocation(newAllocation);

            // Immediately add to optimistic state so it appears in UI
            console.log('✨ [Calendar] Adding temporary allocation to optimistic state');
            setOptimisticAllocations(prev => [...prev, newAllocation]);

            setShowAllocationForm(true);
            console.log('Form should now be visible with allocation in UI');
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
            console.log('🗑️ [Calendar] Optimistically marking allocation as deleted:', allocationId);
            setDeletedAllocationIds(prev => new Set([...prev, allocationId]));

            // Make the delete API call
            router.delete(`/allocations/${allocationId}`, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    console.log('✅ [Calendar] Allocation deleted successfully');
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
        console.log('🟢 [Calendar] handleSaveAllocation called', { savedData, isEdit });

        if (savedData) {
            if (isEdit) {
                // Update existing allocation - replace in optimistic state
                console.log('✨ [Calendar] Updating allocation in optimistic state');
                setOptimisticAllocations(prev => {
                    // Remove both the real ID and any temporary versions
                    const filtered = prev.filter(a =>
                        a.id !== savedData.id && !a._isTemporary
                    );
                    return [...filtered, savedData];
                });
            } else {
                // Replace temporary allocation with real one from API
                console.log('✨ [Calendar] Replacing temporary allocation with real one');
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
        console.log('🟢 [Calendar] Form closed, allocation visible in UI');
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
                                <h1 className="text-base font-semibold text-foreground">
                                    Capacity Planner
                                </h1>
{auth.user?.role === 'admin' && (
                                    <Link
                                        href={route('users.index')}
                                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded hover:bg-muted/50"
                                    >
                                        User Management
                                    </Link>
                                )}
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
                                                <button
                                                    onClick={() => {
                                                        setShowAddMenu(false);
                                                        setShowInviteModal(true);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3 cursor-pointer"
                                                >
                                                    <UserPlus className="h-4 w-4" />
                                                    <span>Invite user</span>
                                                </button>
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
                    {employees.length > 0 && (
                        <div className="flex-shrink-0 py-4">
                            <CalendarHeader
                                currentDate={currentDate}
                                onToday={goToToday}
                            />
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden pb-4">
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
                                onAddAllocation={handleAddAllocation}
                                onEditAllocation={handleEditAllocation}
                                onDeleteAllocation={handleDeleteAllocation}
                                onAddMarker={handleAddMarker}
                                onEditMarker={handleEditMarker}
                                onDeleteMarker={handleDeleteMarker}
                                onAddProject={() => setShowAddProjectModal(true)}
                                onAddPerson={() => setShowInviteModal(true)}
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

                {/* Add project button at bottom left - only show in Projects view */}
                {viewMode === 'project' && (
                    <div className="fixed bottom-6 left-6 z-40">
                        <button
                            onClick={() => setShowAddProjectModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-card border-2 border-border rounded-lg hover:bg-muted transition-colors shadow-lg text-sm font-medium text-foreground cursor-pointer hover:border-primary"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Add project</span>
                        </button>
                    </div>
                )}
            </div>

            {showAllocationForm && employees && projects && (
                <AllocationForm
                    allocation={editingAllocation}
                    employees={employees}
                    projects={projects}
                    onClose={() => {
                        // Remove temporary allocation if user cancels
                        console.log('🚫 [Calendar] Form cancelled, removing temporary allocation');
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
                                    <option value="completed">Completed</option>
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

            {/* Invite User Modal */}
            {showInviteModal && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
                        onClick={() => {
                            if (!inviteUrl) {
                                setShowInviteModal(false);
                                setInviteErrors({});
                            }
                        }}
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
                            <h2 className="text-xl font-semibold text-foreground">
                                {inviteUrl ? 'Invitation Created' : 'Invite User'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowInviteModal(false);
                                    setInviteFirstName('');
                                    setInviteLastName('');
                                    setInviteEmail('');
                                    setInviteRole('user');
                                    setInviteUrl('');
                                    setInviteErrors({});
                                    setCopied(false);
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {inviteUrl ? (
                                // Success state - show the URL to copy
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        Send this link to <span className="font-medium text-foreground">{inviteFirstName} {inviteLastName}</span> to complete their account setup:
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={inviteUrl}
                                            className="flex-1 px-3 py-2.5 text-sm text-foreground bg-muted border border-border rounded-md"
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(inviteUrl);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            className="p-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
                                            title="Copy to clipboard"
                                        >
                                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {copied && (
                                        <p className="text-sm text-green-600 dark:text-green-400">Copied to clipboard!</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        This link will expire in 7 days.
                                    </p>
                                </div>
                            ) : (
                                // Form state
                                <>
                                    {/* First name */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            First name<span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. John"
                                            value={inviteFirstName}
                                            onChange={(e) => setInviteFirstName(e.target.value)}
                                            className="w-full px-3 py-2 text-foreground bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        {inviteErrors.first_name && (
                                            <p className="text-sm text-destructive mt-1">{inviteErrors.first_name}</p>
                                        )}
                                    </div>

                                    {/* Last name */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Last name<span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Doe"
                                            value={inviteLastName}
                                            onChange={(e) => setInviteLastName(e.target.value)}
                                            className="w-full px-3 py-2 text-foreground bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        {inviteErrors.last_name && (
                                            <p className="text-sm text-destructive mt-1">{inviteErrors.last_name}</p>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Email<span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="e.g. john@example.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="w-full px-3 py-2 text-foreground bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        {inviteErrors.email && (
                                            <p className="text-sm text-destructive mt-1">{inviteErrors.email}</p>
                                        )}
                                    </div>

                                    {/* Role */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Role
                                        </label>
                                        <select
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value)}
                                            className="w-full px-3 py-2 text-foreground bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {inviteRole === 'admin' ? 'Can manage users and access admin panel' : 'Standard user access'}
                                        </p>
                                        {inviteErrors.role && (
                                            <p className="text-sm text-destructive mt-1">{inviteErrors.role}</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                            {inviteUrl ? (
                                <button
                                    onClick={() => {
                                        setShowInviteModal(false);
                                        setInviteFirstName('');
                                        setInviteLastName('');
                                        setInviteEmail('');
                                        setInviteRole('user');
                                        setInviteUrl('');
                                        setInviteErrors({});
                                        setCopied(false);
                                    }}
                                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
                                >
                                    Done
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setShowInviteModal(false);
                                            setInviteErrors({});
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!inviteFirstName.trim() || !inviteLastName.trim() || !inviteEmail.trim() || isCreatingInvite) return;

                                            setIsCreatingInvite(true);
                                            setInviteErrors({});
                                            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

                                            try {
                                                const response = await fetch('/api/invitations', {
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        'X-Requested-With': 'XMLHttpRequest',
                                                        'Accept': 'application/json',
                                                        'X-CSRF-TOKEN': csrfToken,
                                                    },
                                                    body: JSON.stringify({
                                                        first_name: inviteFirstName,
                                                        last_name: inviteLastName,
                                                        email: inviteEmail,
                                                        role: inviteRole,
                                                    }),
                                                });

                                                const data = await response.json();

                                                if (response.ok) {
                                                    setInviteUrl(data.invitation_url);
                                                    // Reload to show new user in lists
                                                    router.reload({
                                                        only: ['employees'],
                                                        preserveScroll: true,
                                                        preserveState: true,
                                                    });
                                                } else {
                                                    setInviteErrors(data.errors || { email: data.message || 'Failed to create invitation' });
                                                }
                                            } catch (error) {
                                                setInviteErrors({ email: `Error: ${error.message}` });
                                            } finally {
                                                setIsCreatingInvite(false);
                                            }
                                        }}
                                        disabled={!inviteFirstName.trim() || !inviteLastName.trim() || !inviteEmail.trim() || isCreatingInvite}
                                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {isCreatingInvite ? 'Creating...' : 'Create Invitation'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

