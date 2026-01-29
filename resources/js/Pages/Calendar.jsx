import { useState, useRef, useEffect, useCallback } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { Plus, FolderPlus, X, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import DarkModeToggle from '@/Components/DarkModeToggle';
import CalendarGrid from '@/Components/Calendar/CalendarGrid';
import AllocationForm from '@/Components/Allocation/AllocationForm';
import CalendarMarkerForm from '@/Components/Calendar/CalendarMarkerForm';
import AddEmployeeModal from '@/Components/Employee/AddEmployeeModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";

export default function Calendar({ startDate, endDate, employees, projects, allocations, annualLeave, markers, assignments = [] }) {
    console.log('🔄 [Calendar] Component rendering with:', {
        employees: employees?.length,
        allocations: allocations?.length,
        annualLeave: annualLeave?.length,
        markers: markers?.length,
        assignments: assignments?.length,
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
    const addMenuRef = useRef(null);

    // Add employee modal state
    const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);

    // Unassign confirmation modal state
    const [showUnassignModal, setShowUnassignModal] = useState(false);
    const [pendingUnassign, setPendingUnassign] = useState(null); // { employeeId, projectId, projectName, employeeName, allocationCount }

    // Optimistic UI state - immediately show new allocations/leave/assignments before server confirms
    const [optimisticAllocations, setOptimisticAllocations] = useState([]);
    const [optimisticAnnualLeave, setOptimisticAnnualLeave] = useState([]);
    const [optimisticAssignments, setOptimisticAssignments] = useState([]);
    const [deletedAllocationIds, setDeletedAllocationIds] = useState(new Set());
    const [deletedAssignmentKeys, setDeletedAssignmentKeys] = useState(new Set()); // Keys are "employeeId-projectId"

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
        // Reset scroll position tracking when date range changes
        lastScrollLeft.current = 0;
    }, [startDate, endDate]);

    // Scroll to center today's date on initial load
    useEffect(() => {
        if (hasInitiallyScrolled.current) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        // Wait for the DOM to be fully rendered
        requestAnimationFrame(() => {
            const today = new Date();
            const loadedStart = parseISO(startDate);

            // Calculate days from loaded start to today
            const daysToToday = differenceInDays(today, loadedStart);

            if (daysToToday >= 0) {
                const sidebarWidth = 275;
                const dayColumnWidth = 60;
                const containerWidth = container.clientWidth;

                // The sidebar is sticky, so the visible area for day columns is reduced
                const visibleDayAreaWidth = containerWidth - sidebarWidth;

                // Position of today's column center (in scroll coordinates)
                const todayColumnCenter = daysToToday * dayColumnWidth + (dayColumnWidth / 2);

                // Scroll position to center today in the visible day area
                const scrollPosition = todayColumnCenter - (visibleDayAreaWidth / 2);

                container.scrollLeft = Math.max(0, scrollPosition);
                lastScrollLeft.current = container.scrollLeft;
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
    const displayAssignments = (() => {
        const optimisticIds = new Set(optimisticAssignments.map(a => a.id).filter(Boolean));
        const serverAssignments = assignments.filter(a =>
            !optimisticIds.has(a.id) &&
            !deletedAssignmentKeys.has(`${a.employee_id}-${a.project_id}`)
        );
        const filteredOptimistic = optimisticAssignments.filter(a =>
            !deletedAssignmentKeys.has(`${a.employee_id}-${a.project_id}`)
        );
        return [...serverAssignments, ...filteredOptimistic];
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

    const handleAddAllocation = (startDate, employeeId, endDate = null, projectId = null) => {
        try {
            setAllocationDate(startDate);
            setAllocationUserId(employeeId);

            const newAllocation = {
                start_date: startDate,
                end_date: endDate || startDate,
                employee_id: employeeId,
                project_id: projectId,
                type: 'project',
                days_per_week: 5.0,
                title: '',
                id: `temp-${Date.now()}`,
                _isTemporary: true,
            };

            setEditingAllocation(newAllocation);
            setShowAllocationForm(true);
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

    const handleAssignProject = async (employeeId, projectId) => {
        const tempId = `temp-${Date.now()}`;

        // Find the project for optimistic update
        const project = projects.find(p => p.id === projectId);

        // Create optimistic assignment (just links employee to project, no allocation)
        const optimisticAssignment = {
            id: tempId,
            employee_id: employeeId,
            project_id: projectId,
            project: project,
            _isTemporary: true,
        };

        setOptimisticAssignments(prev => [...prev, optimisticAssignment]);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

            const response = await fetch('/api/assignments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    employee_id: employeeId,
                    project_id: projectId,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                // Replace optimistic assignment with real one
                setOptimisticAssignments(prev =>
                    prev.map(a => a.id === tempId ? result.assignment : a)
                );
            } else {
                // Remove optimistic assignment on error
                setOptimisticAssignments(prev => prev.filter(a => a.id !== tempId));
                console.error('Error assigning project:', result);
            }
        } catch (error) {
            // Remove optimistic assignment on error
            setOptimisticAssignments(prev => prev.filter(a => a.id !== tempId));
            console.error('Error assigning project:', error);
        }
    };

    const handleUnassignProject = (employeeId, projectId) => {
        // Find project and employee names for the modal
        const project = projects.find(p => p.id === projectId);
        const employee = employees.find(e => e.id === employeeId);

        // Count allocations that will be deleted
        const allocationCount = allocations.filter(
            a => a.employee_id === employeeId && a.project_id === projectId
        ).length;

        // Show confirmation modal
        setPendingUnassign({
            employeeId,
            projectId,
            projectName: project?.name || 'Unknown Project',
            employeeName: employee?.name || 'Unknown Employee',
            allocationCount,
        });
        setShowUnassignModal(true);
    };

    const confirmUnassignProject = async () => {
        if (!pendingUnassign) return;

        const { employeeId, projectId } = pendingUnassign;
        const assignmentKey = `${employeeId}-${projectId}`;

        // Find all allocations for this employee+project to delete
        const allocationsToDelete = allocations.filter(
            a => a.employee_id === employeeId && a.project_id === projectId
        );

        // Close modal
        setShowUnassignModal(false);
        setPendingUnassign(null);

        // Optimistically mark assignment as deleted
        setDeletedAssignmentKeys(prev => new Set([...prev, assignmentKey]));

        // Optimistically mark allocations as deleted
        allocationsToDelete.forEach(alloc => {
            setDeletedAllocationIds(prev => new Set([...prev, alloc.id]));
        });

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

            // Delete the assignment (if exists)
            await fetch('/api/assignments', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    employee_id: employeeId,
                    project_id: projectId,
                }),
            });

            // Delete all allocations for this employee+project
            for (const alloc of allocationsToDelete) {
                await fetch(`/allocations/${alloc.id}`, {
                    method: 'DELETE',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                });
            }
        } catch (error) {
            console.error('Error unassigning project:', error);
            // Restore on error
            setDeletedAssignmentKeys(prev => {
                const newSet = new Set(prev);
                newSet.delete(assignmentKey);
                return newSet;
            });
            allocationsToDelete.forEach(alloc => {
                setDeletedAllocationIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(alloc.id);
                    return newSet;
                });
            });
        }
    };

    const handleEditProject = (projectId) => {
        // Redirect to admin panel to edit project
        window.open(`/admin/projects/${projectId}/edit`, '_blank');
    };

    const handleUpdateProjectStatus = async (projectId, status) => {
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

            const response = await fetch(`/projects/${projectId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ status }),
            });

            if (response.ok) {
                // Refresh to get updated project data
                router.reload({ only: ['projects'] });
            } else {
                console.error('Error updating project status');
            }
        } catch (error) {
            console.error('Error updating project status:', error);
        }
    };

    const handleDeleteProject = async (projectId) => {
        if (!confirm('Are you sure you want to delete this project? This will also delete all associated allocations.')) {
            return;
        }

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

            const response = await fetch(`/projects/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });

            if (response.ok) {
                // Refresh to get updated data
                router.reload({ only: ['projects', 'allocations', 'assignments'] });
            } else {
                console.error('Error deleting project');
            }
        } catch (error) {
            console.error('Error deleting project:', error);
        }
    };

    const handleSaveAllocation = (savedData, isEdit = false) => {
        if (savedData) {
            if (isEdit) {
                // Update existing allocation - replace in optimistic state
                setOptimisticAllocations(prev => {
                    const filtered = prev.filter(a =>
                        a.id !== savedData.id && !a._isTemporary
                    );
                    return [...filtered, savedData];
                });
            } else {
                // Add new allocation from API
                setOptimisticAllocations(prev => {
                    const filtered = prev.filter(a => !a._isTemporary);
                    return [...filtered, savedData];
                });
            }
        }

        setShowAllocationForm(false);
        setEditingAllocation(null);
        setAllocationDate(null);
        setAllocationUserId(null);
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
                <nav className="border-b border-border sticky top-0 z-50 bg-white dark:bg-[#292929]">
                    <div className="max-w-full px-4">
                        <div className="flex items-center h-14">
                            {/* Left section */}
                            <div className="flex items-center gap-4 flex-1">
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

                            {/* Center section - Today with arrows */}
                            <div className="flex items-center gap-1 bg-muted rounded-lg px-1 py-1">
                                <button
                                    onClick={() => scrollContainerRef.current?.scrollBy({ left: -420, behavior: 'smooth' })}
                                    className="p-1.5 hover:bg-background rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Scroll left"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={goToToday}
                                    className="px-4 py-1.5 text-sm font-medium bg-background hover:bg-background/80 rounded transition-colors text-foreground cursor-pointer"
                                    title="Go to today"
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => scrollContainerRef.current?.scrollBy({ left: 420, behavior: 'smooth' })}
                                    className="p-1.5 hover:bg-background rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Scroll right"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Right section */}
                            <div className="flex items-center gap-3 flex-1 justify-end">
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
                    <div className="flex-1 pb-4" style={{ minWidth: 0 }}>
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
                                assignments={displayAssignments}
                                onAddAllocation={handleAddAllocation}
                                onEditAllocation={handleEditAllocation}
                                onDeleteAllocation={handleDeleteAllocation}
                                onAssignProject={handleAssignProject}
                                onUnassignProject={handleUnassignProject}
                                onEditProject={handleEditProject}
                                onUpdateProjectStatus={handleUpdateProjectStatus}
                                onDeleteProject={handleDeleteProject}
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
                        setShowAllocationForm(false);
                        setEditingAllocation(null);
                        setAllocationDate(null);
                        setAllocationUserId(null);
                    }}
                    onSave={handleSaveAllocation}
                    onDelete={handleDeleteAllocation}
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

            {/* Unassign Project Confirmation Modal */}
            <Dialog open={showUnassignModal && !!pendingUnassign} onOpenChange={(open) => {
                if (!open) {
                    setShowUnassignModal(false);
                    setPendingUnassign(null);
                }
            }}>
                <DialogContent className="max-w-md border-2 border-primary">
                    <DialogHeader>
                        <DialogTitle>Unassign Project</DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        <p className="text-foreground">
                            Are you sure you want to unassign <span className="font-semibold">{pendingUnassign?.projectName}</span> from <span className="font-semibold">{pendingUnassign?.employeeName}</span>?
                        </p>
                        {pendingUnassign?.allocationCount > 0 && (
                            <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                                This will also delete {pendingUnassign.allocationCount} allocation{pendingUnassign.allocationCount !== 1 ? 's' : ''} for this project.
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setShowUnassignModal(false);
                                setPendingUnassign(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmUnassignProject}
                        >
                            Unassign
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

