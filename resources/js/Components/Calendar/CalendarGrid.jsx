import {
    format,
    eachDayOfInterval,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    isSameDay,
    isWithinInterval,
    parseISO,
    getDay,
    isSameMonth,
    differenceInDays,
    startOfDay,
    addDays,
} from "date-fns";
import { useState, useEffect, useRef, forwardRef } from "react";
import {
    ChevronDown,
    ChevronRight,
    Plus,
    Search,
    X,
    Umbrella,
    ArrowUpDown,
    ArrowDownAZ,
    ChevronsDownUp,
    ChevronsUpDown,
    MoreHorizontal,
    Trash2,
    Pencil,
} from "lucide-react";
import AllocationBlock from "../Allocation/AllocationBlock";
import { router, Link } from "@inertiajs/react";

const CalendarGrid = forwardRef(({
    view,
    viewMode,
    sortMode,
    isCompressed,
    currentDate,
    dateRange,
    employees,
    projects,
    allocations,
    annualLeave,
    markers,
    onAddAllocation,
    onEditAllocation,
    onDeleteAllocation,
    onAddMarker,
    onEditMarker,
    onDeleteMarker,
    onOptimisticAllocation,
    onOptimisticLeave,
    onRemoveOptimisticLeave,
    onAddProject,
    onAddPerson,
    auth,
    onViewModeChange,
    onSortModeChange,
    onToggleCompress,
    isLoadingPrevious = false,
    isLoadingNext = false,
}, ref) => {
    // Check if user can add/modify allocations (guests cannot)
    const canModifyAllocations = auth?.user?.role !== 'guest';

    // Group projects by status for project view
    const getProjectRows = () => {
        if (viewMode !== "project") return [];

        const statusGroups = {
            to_do: { name: "To do", projects: [], color: "#f59e0b" },
            in_progress: {
                name: "In progress",
                projects: [],
                color: "#3b82f6",
            },
            done: { name: "Done", projects: [], color: "#10b981" },
        };

        projects.forEach((project) => {
            const status = project.status || "to_do";
            if (statusGroups[status]) {
                statusGroups[status].projects.push(project);
            }
        });

        return Object.entries(statusGroups).map(([status, group]) => ({
            id: `status-${status}`,
            name: group.name,
            color: group.color,
            status: status,
            isStatusGroup: true,
            projects: group.projects,
        }));
    };

    // Sort rows based on sortMode
    const getSortedRows = (rowsToSort) => {
        if (sortMode === "name") {
            return [...rowsToSort].sort((a, b) => {
                const nameA = a.name || "";
                const nameB = b.name || "";
                return nameA.localeCompare(nameB);
            });
        }
        return rowsToSort; // Manual ordering - keep original order
    };

    const rows = getSortedRows(
        viewMode === "people" ? employees : getProjectRows(),
    );

    const [hoveredCell, setHoveredCell] = useState(null);
    const [resizingAllocation, setResizingAllocation] = useState(null);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [resizeStartDays, setResizeStartDays] = useState(0);
    const [resizePreviewDays, setResizePreviewDays] = useState(0);
    const [resizePreviewStartOffset, setResizePreviewStartOffset] = useState(0); // Days to shift start when resizing left
    const [isActivelyResizing, setIsActivelyResizing] = useState(false); // Track if mouse is down
    const [resizeOriginalStartDate, setResizeOriginalStartDate] = useState(null); // Store original start date to detect when data updates

    // Project assignment dropdown
    const [showProjectMenu, setShowProjectMenu] = useState(null); // { rowId, x, y }
    const [projectSearchQuery, setProjectSearchQuery] = useState("");

    // Person assignment dropdown (for project view)
    const [showPersonMenu, setShowPersonMenu] = useState(null); // { projectId, x, y }
    const [personSearchQuery, setPersonSearchQuery] = useState("");

    // Add project modal

    // Drag-to-create state
    const [isDraggingNew, setIsDraggingNew] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragEnd, setDragEnd] = useState(null);
    const [dragRowId, setDragRowId] = useState(null);
    const [dragProjectId, setDragProjectId] = useState(null);
    const isProcessingDrag = useRef(false); // Prevent multiple simultaneous creations
    const pendingClickRef = useRef(null); // Track pending click for drag detection
    const hasMovedForDrag = useRef(false); // Track if mouse moved enough to be a drag

    // Drag-to-move existing allocation state
    const [draggingAllocation, setDraggingAllocation] = useState(null);
    const [dragOffset, setDragOffset] = useState(0); // Days offset from original start
    const [dragPreviewStart, setDragPreviewStart] = useState(null);
    const [dragOriginalStartDate, setDragOriginalStartDate] = useState(null); // Store original start date to detect when data updates
    const [isActivelyDragging, setIsActivelyDragging] = useState(false); // Track if mouse is down
    const [dragGrabOffset, setDragGrabOffset] = useState(0); // Which day within the allocation was grabbed (0 = first day, 1 = second day, etc.)
    const dragStartPos = useRef(null); // Track initial mouse position
    const hasMoved = useRef(false); // Track if mouse has moved enough to be considered a drag

    // Context menu for allocations
    const [contextMenu, setContextMenu] = useState(null); // { allocation, isLeave, x, y }

    // Employee menu state
    const [employeeMenu, setEmployeeMenu] = useState(null); // { employee, x, y }
    const [editingEmployeeName, setEditingEmployeeName] = useState(null); // { id, name }

    // Initialize all rows as expanded by default
    const [expandedRows, setExpandedRows] = useState({});

    // Update expanded rows when rows change, expanding all by default
    useEffect(() => {
        const initialExpanded = {};
        rows.forEach((row) => {
            initialExpanded[row.id] = !isCompressed; // Expand if not compressed
        });
        setExpandedRows(initialExpanded);
    }, [employees.length, projects.length, viewMode, isCompressed]);

    const getDaysInView = () => {
        if (view === "day") {
            return [currentDate];
        } else if (view === "week") {
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
            return eachDayOfInterval({ start: weekStart, end: weekEnd });
        } else {
            // Use the actual date range passed from parent (90-day window)
            return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
        }
    };

    const days = getDaysInView();
    const today = new Date();

    // Group days by month for month headers
    const monthGroups = {};
    days.forEach((day) => {
        const monthKey = format(day, "MMMM yyyy");
        if (!monthGroups[monthKey]) {
            monthGroups[monthKey] = [];
        }
        monthGroups[monthKey].push(day);
    });

    useEffect(() => {
        const handleMove = (e) => {
            if (!resizingAllocation || !isActivelyResizing) return;

            const deltaX = e.clientX - resizeStartX;
            const cellWidth = 60; // Calendar cells are 60px wide
            const deltaDays = Math.round(deltaX / cellWidth);

            let newDays = resizeStartDays;
            let startOffset = 0; // How many days to shift the start position

            if (resizingAllocation.edge === "right") {
                newDays = Math.max(1, resizeStartDays + deltaDays);
            } else {
                // left edge - dragging left (negative deltaDays) should add days
                // Since deltaDays is negative when dragging left, we ADD it (double negative)
                newDays = Math.max(1, resizeStartDays + (-deltaDays));
                // Calculate how many days to shift the start position
                startOffset = -(newDays - resizeStartDays);
            }

            // Update preview in real-time
            setResizePreviewDays(newDays);
            setResizePreviewStartOffset(startOffset);
        };

        const handleUp = async (e) => {
            if (!resizingAllocation) return;

            // Immediately stop listening to mouse movements
            setIsActivelyResizing(false);

            // Restore cursor and text selection
            document.body.style.userSelect = "";
            document.body.classList.remove("resizing-allocation");

            const deltaX = e.clientX - resizeStartX;
            const cellWidth = 60; // Calendar cells are 60px wide
            const deltaDays = Math.round(deltaX / cellWidth);

            let newDays = resizeStartDays;
            if (resizingAllocation.edge === "right") {
                newDays = Math.max(1, resizeStartDays + deltaDays);
            } else {
                // left edge - dragging left (negative deltaDays) should add days
                // Since deltaDays is negative when dragging left, we ADD it (double negative)
                newDays = Math.max(1, resizeStartDays + (-deltaDays));
            }

            // Only update if days changed
            if (newDays !== resizeStartDays) {
                const allocation = resizingAllocation.allocation;
                const isLeave = resizingAllocation.isLeave;
                const originalStartDate = startOfDay(
                    parseISO(
                        isLeave ? allocation.start_date : allocation.start_date,
                    ),
                );
                const originalEndDate = startOfDay(
                    parseISO(
                        isLeave ? allocation.end_date : allocation.end_date,
                    ),
                );

                console.log('BEFORE CALCULATION:', {
                    edge: resizingAllocation.edge,
                    originalStart: format(originalStartDate, 'yyyy-MM-dd'),
                    originalEnd: format(originalEndDate, 'yyyy-MM-dd'),
                    resizeStartDays: resizeStartDays,
                    deltaDays: deltaDays,
                    newDays: newDays,
                });

                let newStartDate;
                let newEndDate;

                if (resizingAllocation.edge === "right") {
                    // Extending/shrinking from right - keep start, change end
                    newStartDate = originalStartDate;
                    newEndDate = new Date(originalStartDate);
                    newEndDate.setDate(newEndDate.getDate() + newDays - 1);
                } else {
                    // Extending/shrinking from left - keep end date fixed, calculate new start
                    newEndDate = originalEndDate;
                    // Calculate new start date by going backwards from the end
                    newStartDate = new Date(originalEndDate);
                    newStartDate.setDate(newStartDate.getDate() - (newDays - 1));
                }

                console.log('AFTER CALCULATION:', {
                    newStart: format(newStartDate, 'yyyy-MM-dd'),
                    newEnd: format(newEndDate, 'yyyy-MM-dd'),
                });

                try {
                    const csrfToken =
                        document.querySelector('meta[name="csrf-token"]')
                            ?.content || "";

                    if (isLeave) {
                        await fetch(`/annual-leave/${allocation.id}`, {
                            method: "PUT",
                            credentials: "same-origin",
                            headers: {
                                "Content-Type": "application/json",
                                "X-Requested-With": "XMLHttpRequest",
                                Accept: "application/json",
                                "X-CSRF-TOKEN": csrfToken,
                            },
                            body: JSON.stringify({
                                start_date: format(newStartDate, "yyyy-MM-dd"),
                                end_date: format(newEndDate, "yyyy-MM-dd"),
                                days_count: newDays,
                            }),
                        });
                    } else {
                        await fetch(`/allocations/${allocation.id}`, {
                            method: "PUT",
                            credentials: "same-origin",
                            headers: {
                                "Content-Type": "application/json",
                                "X-Requested-With": "XMLHttpRequest",
                                Accept: "application/json",
                                "X-CSRF-TOKEN": csrfToken,
                            },
                            body: JSON.stringify({
                                start_date: format(newStartDate, "yyyy-MM-dd"),
                                end_date: format(newEndDate, "yyyy-MM-dd"),
                            }),
                        });
                    }

                    router.reload({
                        only: ["allocations", "annualLeave"],
                        preserveScroll: true,
                        onFinish: () => {
                            // Clear resize state only after reload completes
                            setResizingAllocation(null);
                            setResizePreviewStartOffset(0);
                            setResizeOriginalStartDate(null);
                        }
                    });
                } catch (error) {
                    console.error("Error resizing:", error);
                    // Clear state on error
                    setResizingAllocation(null);
                    setResizePreviewStartOffset(0);
                    setResizeOriginalStartDate(null);
                }
            } else {
                // No change in days, just clear state immediately
                setResizingAllocation(null);
                setResizePreviewStartOffset(0);
                setResizeOriginalStartDate(null);
            }
        };

        if (isActivelyResizing) {
            window.addEventListener("mousemove", handleMove);
            window.addEventListener("mouseup", handleUp);
            return () => {
                window.removeEventListener("mousemove", handleMove);
                window.removeEventListener("mouseup", handleUp);
            };
        }
    }, [isActivelyResizing, resizingAllocation, resizeStartX, resizeStartDays]);

    const toggleRow = (rowId) => {
        setExpandedRows((prev) => ({
            ...prev,
            [rowId]: !prev[rowId],
        }));
    };

    const getRowProjects = (row) => {
        if (viewMode === "people") {
            const userAllocations = allocations.filter(
                (a) => a.employee_id === row.id,
            );
            const userLeave = annualLeave.filter((l) => l.employee_id === row.id);

            const projectMap = new Map();

            // Always add time off (required field)
            projectMap.set("time-off", {
                id: "time-off",
                name: "Time off",
                count: userLeave.length,
                type: "leave",
                allocations: userLeave,
            });

            // Add projects
            userAllocations.forEach((alloc) => {
                if (alloc.type === "project" && alloc.project) {
                    if (!projectMap.has(alloc.project_id)) {
                        projectMap.set(alloc.project_id, {
                            id: alloc.project_id,
                            name: alloc.project.name,
                            color: alloc.project.color,
                            count: 0,
                            type: "project",
                            allocations: [],
                        });
                    }
                    const proj = projectMap.get(alloc.project_id);
                    proj.count++;
                    proj.allocations.push(alloc);
                } else if (alloc.type !== "project") {
                    const key = `${alloc.type}-${alloc.title}`;
                    if (!projectMap.has(key)) {
                        projectMap.set(key, {
                            id: key,
                            name: alloc.title || alloc.type,
                            count: 0,
                            type: alloc.type,
                            allocations: [],
                        });
                    }
                    const proj = projectMap.get(key);
                    proj.count++;
                    proj.allocations.push(alloc);
                }
            });

            return Array.from(projectMap.values());
        } else if (viewMode === "project" && row.isStatusGroup) {
            // For project view, return the projects within this status group
            return row.projects
                .map((project) => {
                    const projectAllocations = allocations.filter(
                        (a) => a.project_id === project.id,
                    );
                    return {
                        id: project.id,
                        name: project.name,
                        color: project.color,
                        count: projectAllocations.length,
                        type: "project",
                        allocations: projectAllocations,
                    };
                })
                .filter((p) => p.count > 0 || true); // Show all projects, even without allocations
        }
        return [];
    };

    const handleDragNewStart = (day, rowId, projectId) => {
        // Guests cannot create allocations
        if (!canModifyAllocations) return;
        // Prevent starting a new drag if one is already in progress or processing
        if (isDraggingNew || isProcessingDrag.current || pendingClickRef.current) return;

        // Store pending click info - we'll decide if it's a click or drag on mouseup/mousemove
        pendingClickRef.current = { day, rowId, projectId };
        hasMovedForDrag.current = false;

        // Set drag state for visual preview while mouse is down
        setIsDraggingNew(true);
        setDragStart(day);
        setDragEnd(day);
        setDragRowId(rowId);
        setDragProjectId(projectId);
    };

    const handleDragNewMove = (day) => {
        // Only update drag end if we're actually dragging
        if (isDraggingNew && dragStart) {
            // If user moved to a different day, this is now a real drag
            if (day.getTime() !== dragStart.getTime()) {
                hasMovedForDrag.current = true;
            }
            setDragEnd(day);
        }
    };

    const handleDragNewEnd = async () => {
        // Prevent multiple submissions
        if (isProcessingDrag.current) return;
        if (
            !isDraggingNew ||
            !dragStart ||
            !dragEnd ||
            !dragRowId ||
            !dragProjectId
        )
            return;

        // Mark as processing immediately
        isProcessingDrag.current = true;

        const startDay = dragStart < dragEnd ? dragStart : dragEnd;
        const endDay = dragStart < dragEnd ? dragEnd : dragStart;
        const daysCount = differenceInDays(endDay, startDay) + 1;

        // Clear drag state immediately
        setIsDraggingNew(false);
        setDragStart(null);
        setDragEnd(null);
        setDragRowId(null);
        setDragProjectId(null);

        try {
            const csrfToken =
                document.querySelector('meta[name="csrf-token"]')?.content ||
                "";

            // Handle time-off (annual leave)
            if (dragProjectId === "time-off") {
                const payload = {
                    employee_id: dragRowId,
                    start_date: format(startDay, "yyyy-MM-dd"),
                    end_date: format(endDay, "yyyy-MM-dd"),
                    days_count: daysCount,
                    status: "approved",
                };

                // Create a temporary optimistic entry IMMEDIATELY (before API call)
                const tempId = `temp-leave-${Date.now()}`;
                const optimisticEntry = {
                    id: tempId,
                    employee_id: dragRowId,
                    start_date: format(startDay, "yyyy-MM-dd"),
                    end_date: format(endDay, "yyyy-MM-dd"),
                    days_count: daysCount,
                    status: "approved",
                    _isTemporary: true,
                };

                // Show the block immediately - this is the key to no flicker
                if (onOptimisticLeave) {
                    onOptimisticLeave(optimisticEntry);
                }
                isProcessingDrag.current = false;

                // Make API call in background - fire and forget for UI purposes
                // The optimistic entry stays visible; we only remove it on error
                fetch("/annual-leave", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        Accept: "application/json",
                        "X-CSRF-TOKEN": csrfToken,
                    },
                    body: JSON.stringify(payload),
                }).then(async (response) => {
                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error("❌ [TimeOff] Failed to create leave:", errorData);
                        // Remove the optimistic entry on error
                        if (onRemoveOptimisticLeave) {
                            onRemoveOptimisticLeave(tempId);
                        }
                        alert("Failed to create time off. Please try again.");
                    }
                    // On success: do nothing - optimistic entry stays visible
                }).catch((error) => {
                    console.error("❌ [TimeOff] Exception:", error);
                    // Remove the optimistic entry on error
                    if (onRemoveOptimisticLeave) {
                        onRemoveOptimisticLeave(tempId);
                    }
                    alert("Failed to create time off. Please try again.");
                });
            } else {
                // Handle project allocation
                const payload = {
                    employee_id: dragRowId,
                    project_id: dragProjectId,
                    type: "project",
                    start_date: format(startDay, "yyyy-MM-dd"),
                    end_date: format(endDay, "yyyy-MM-dd"),
                    days_per_week: 5.0,
                };

                console.log("=== ALLOCATION DRAG-DROP DEBUG ===");
                console.log("🔵 [DragAlloc] Payload:", payload);

                const response = await fetch("/allocations", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        Accept: "application/json",
                        "X-CSRF-TOKEN": csrfToken,
                    },
                    body: JSON.stringify(payload),
                });

                console.log("🔵 [DragAlloc] Response Status:", response.status);
                console.log("🔵 [DragAlloc] Response OK:", response.ok);

                if (response.ok) {
                    const responseData = await response.json();
                    console.log("✅ [DragAlloc] Success Response:", responseData);

                    // Add optimistic allocation immediately - no reload needed
                    if (onOptimisticAllocation && responseData) {
                        console.log("✨ [DragAlloc] Adding optimistic allocation (no reload)");
                        onOptimisticAllocation(responseData);
                    }

                    // No reload needed - optimistic update handles UI immediately
                    console.log("🟢 [DragAlloc] Allocation created, visible via optimistic state");
                    isProcessingDrag.current = false;
                } else {
                    const errorData = await response.json();
                    console.error("❌ [DragAlloc] Failed to create allocation:", errorData);
                    console.error("❌ [DragAlloc] Error response full details:", {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorData
                    });
                    alert("Failed to create allocation. Please try again.");
                    isProcessingDrag.current = false;
                }
            }
        } catch (error) {
            console.error("❌ [DragDrop] Caught exception:", error);
            alert("Failed to create entry. Please try again.");
            isProcessingDrag.current = false;
        }
    };

    // Listen for mouseup to end drag/click
    useEffect(() => {
        if (isDraggingNew && dragStart && dragEnd && dragRowId && dragProjectId) {
            const handleMouseUp = () => {
                // Clear pending click ref
                pendingClickRef.current = null;

                // Capture current values to avoid stale closure issues
                const currentDragStart = dragStart;
                const currentDragEnd = dragEnd;
                const currentDragRowId = dragRowId;
                const currentDragProjectId = dragProjectId;
                const wasDrag = hasMovedForDrag.current;

                // Reset drag tracking
                hasMovedForDrag.current = false;

                // Prevent multiple submissions
                if (isProcessingDrag.current) return;
                isProcessingDrag.current = true;

                const startDay = currentDragStart < currentDragEnd ? currentDragStart : currentDragEnd;
                const endDay = currentDragStart < currentDragEnd ? currentDragEnd : currentDragStart;
                const daysCount = differenceInDays(endDay, startDay) + 1;

                // Clear drag state immediately
                setIsDraggingNew(false);
                setDragStart(null);
                setDragEnd(null);
                setDragRowId(null);
                setDragProjectId(null);

                // Handle time-off (annual leave)
                if (currentDragProjectId === "time-off") {
                    // Create optimistic entry IMMEDIATELY - this runs synchronously
                    const tempId = `temp-leave-${Date.now()}`;
                    const optimisticEntry = {
                        id: tempId,
                        employee_id: currentDragRowId,
                        start_date: format(startDay, "yyyy-MM-dd"),
                        end_date: format(endDay, "yyyy-MM-dd"),
                        days_count: daysCount,
                        status: "approved",
                        _isTemporary: true,
                    };

                    // Show block immediately
                    if (onOptimisticLeave) {
                        onOptimisticLeave(optimisticEntry);
                    }

                    isProcessingDrag.current = false;

                    // Fire API call in background
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || "";
                    fetch("/annual-leave", {
                        method: "POST",
                        credentials: "same-origin",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                            Accept: "application/json",
                            "X-CSRF-TOKEN": csrfToken,
                        },
                        body: JSON.stringify({
                            employee_id: currentDragRowId,
                            start_date: format(startDay, "yyyy-MM-dd"),
                            end_date: format(endDay, "yyyy-MM-dd"),
                            days_count: daysCount,
                            status: "approved",
                        }),
                    }).then(async (response) => {
                        if (!response.ok) {
                            if (onRemoveOptimisticLeave) {
                                onRemoveOptimisticLeave(tempId);
                            }
                            alert("Failed to create time off. Please try again.");
                        }
                    }).catch(() => {
                        if (onRemoveOptimisticLeave) {
                            onRemoveOptimisticLeave(tempId);
                        }
                        alert("Failed to create time off. Please try again.");
                    });
                } else {
                    // Handle project allocation inline (can't call handleDragNewEnd since state is already cleared)
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || "";
                    const payload = {
                        employee_id: currentDragRowId,
                        project_id: currentDragProjectId,
                        type: "project",
                        start_date: format(startDay, "yyyy-MM-dd"),
                        end_date: format(endDay, "yyyy-MM-dd"),
                        days_per_week: 5.0,
                    };

                    console.log("=== ALLOCATION DRAG-DROP DEBUG (mouseup handler) ===");
                    console.log("🔵 [DragAlloc] Payload:", payload);

                    fetch("/allocations", {
                        method: "POST",
                        credentials: "same-origin",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                            Accept: "application/json",
                            "X-CSRF-TOKEN": csrfToken,
                        },
                        body: JSON.stringify(payload),
                    }).then(async (response) => {
                        console.log("🔵 [DragAlloc] Response Status:", response.status);
                        if (response.ok) {
                            const responseData = await response.json();
                            console.log("✅ [DragAlloc] Success Response:", responseData);
                            // Backend returns { allocation: {...}, warnings: [...] }
                            const allocation = responseData.allocation || responseData;
                            if (onOptimisticAllocation && allocation) {
                                console.log("✨ [DragAlloc] Adding optimistic allocation");
                                onOptimisticAllocation(allocation);
                            }
                        } else {
                            const errorData = await response.json();
                            console.error("❌ [DragAlloc] Failed:", errorData);
                            alert("Failed to create allocation. Please try again.");
                        }
                        isProcessingDrag.current = false;
                    }).catch((error) => {
                        console.error("❌ [DragAlloc] Exception:", error);
                        alert("Failed to create allocation. Please try again.");
                        isProcessingDrag.current = false;
                    });
                }
            };
            window.addEventListener("mouseup", handleMouseUp, { once: true });
            return () => window.removeEventListener("mouseup", handleMouseUp);
        }
    }, [isDraggingNew, dragStart, dragEnd, dragRowId, dragProjectId, onOptimisticLeave, onRemoveOptimisticLeave, onOptimisticAllocation]);

    // Close project menu on Escape key
    useEffect(() => {
        if (showProjectMenu) {
            const handleEscape = (e) => {
                if (e.key === "Escape") {
                    setShowProjectMenu(null);
                }
            };
            window.addEventListener("keydown", handleEscape);
            return () => window.removeEventListener("keydown", handleEscape);
        }
    }, [showProjectMenu]);

    // Close person menu on Escape key
    useEffect(() => {
        if (showPersonMenu) {
            const handleEscape = (e) => {
                if (e.key === "Escape") {
                    setShowPersonMenu(null);
                }
            };
            window.addEventListener("keydown", handleEscape);
            return () => window.removeEventListener("keydown", handleEscape);
        }
    }, [showPersonMenu]);

    const handleResizeStart = (e, allocation, isLeave, edge) => {
        // Guests cannot modify allocations
        if (!canModifyAllocations) return;
        // Prevent starting resize if drag is in progress
        if (draggingAllocation) {
            console.log("Resize prevented - drag in progress");
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        // Prevent text selection and force cursor during drag
        document.body.style.userSelect = "none";
        document.body.classList.add("resizing-allocation");

        // Clear any hover state
        setHoveredCell(null);

        const startDate = startOfDay(
            parseISO(isLeave ? allocation.start_date : allocation.start_date),
        );
        const endDate = startOfDay(
            parseISO(isLeave ? allocation.end_date : allocation.end_date),
        );
        const days = differenceInDays(endDate, startDate) + 1;

        setResizingAllocation({ allocation, isLeave, edge });
        setResizeStartX(e.clientX);
        setResizeStartDays(days);
        setResizePreviewDays(days);
        setResizePreviewStartOffset(0); // Reset offset at start
        setResizeOriginalStartDate(allocation.start_date); // Store original start date
        setIsActivelyResizing(true); // Start listening to mouse movements
    };

    const handleDragAllocationStart = (e, allocation, isLeave) => {
        // Guests cannot modify allocations
        if (!canModifyAllocations) return;
        // Prevent starting a new drag if one is already in progress
        if (draggingAllocation || resizingAllocation) {
            console.log("Drag prevented - another operation in progress");
            return;
        }

        // Only allow dragging from the center area, not resize handles
        if (
            e.target.classList.contains("cursor-ew-resize") ||
            e.target.closest(".cursor-ew-resize")
        ) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        console.log("Starting drag:", {
            allocationId: allocation.id,
            isLeave,
            name: allocation.project?.name || "Leave",
        });

        // Save initial mouse position
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        hasMoved.current = false;

        document.body.style.userSelect = "none";

        // Calculate which day within the allocation was grabbed
        const table = document.querySelector("table");
        if (table) {
            const tableRect = table.getBoundingClientRect();
            const cellIndex = Math.floor((e.clientX - tableRect.left - 274) / 60);

            // Find which day in the calendar corresponds to this cell
            const startDate = startOfDay(parseISO(allocation.start_date));
            const clickedDay = days[cellIndex];

            if (clickedDay) {
                // Calculate offset within the allocation (0 = first day, 1 = second day, etc.)
                const grabOffset = differenceInDays(startOfDay(clickedDay), startDate);
                setDragGrabOffset(Math.max(0, grabOffset)); // Ensure non-negative
                console.log("Grab offset:", grabOffset, "days from start");
            } else {
                setDragGrabOffset(0);
            }
        }

        // Set initial preview to allocation's current position (no offset yet)
        const startDate = startOfDay(
            parseISO(isLeave ? allocation.start_date : allocation.start_date),
        );

        setDraggingAllocation({ allocation, isLeave });
        setDragOffset(0); // Start with no offset
        setDragPreviewStart(startDate); // Start preview at current position
        setDragOriginalStartDate(allocation.start_date); // Store original start date
        setIsActivelyDragging(true); // Start listening to mouse movements
    };

    useEffect(() => {
        const handleDragMove = (e) => {
            if (!draggingAllocation) return;

            // Check if mouse has moved enough to be considered a drag (5px threshold)
            if (!hasMoved.current && dragStartPos.current) {
                const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
                const deltaY = Math.abs(e.clientY - dragStartPos.current.y);
                if (deltaX > 5 || deltaY > 5) {
                    hasMoved.current = true;
                    document.body.classList.add("dragging-allocation");
                }
            }

            // Only process drag if moved enough
            if (!hasMoved.current) return;

            const table = document.querySelector("table");
            if (!table) return;

            const tableRect = table.getBoundingClientRect();
            const cellIndex = Math.floor((e.clientX - tableRect.left - 274) / 60);

            // Subtract the grab offset to maintain the relative position where the user grabbed
            const targetCellIndex = cellIndex - dragGrabOffset;
            const clampedIndex = Math.max(0, Math.min(targetCellIndex, days.length - 1));

            if (clampedIndex >= 0 && clampedIndex < days.length) {
                const targetDay = days[clampedIndex];
                const originalStart = startOfDay(
                    parseISO(
                        draggingAllocation.isLeave
                            ? draggingAllocation.allocation.start_date
                            : draggingAllocation.allocation.start_date,
                    ),
                );
                const newOffset = differenceInDays(
                    startOfDay(targetDay),
                    originalStart,
                );
                setDragOffset(newOffset);
                setDragPreviewStart(startOfDay(targetDay));
            }
        };

        const handleDragEnd = async (e) => {
            if (!draggingAllocation) return;

            // Immediately stop listening to mouse movements
            setIsActivelyDragging(false);

            document.body.style.userSelect = "";
            document.body.classList.remove("dragging-allocation");

            // If not moved enough, open edit form directly instead of trying to drag
            if (!hasMoved.current) {
                // Open edit form for allocations (not leave)
                if (!draggingAllocation.isLeave) {
                    onEditAllocation(draggingAllocation.allocation);
                }
                setDraggingAllocation(null);
                setDragOffset(0);
                setDragPreviewStart(null);
                setDragOriginalStartDate(null);
                setDragGrabOffset(0);
                dragStartPos.current = null;
                hasMoved.current = false;
                return;
            }

            if (dragOffset !== 0 && dragPreviewStart) {
                const allocation = draggingAllocation.allocation;
                const originalStart = parseISO(
                    draggingAllocation.isLeave
                        ? allocation.start_date
                        : allocation.start_date,
                );
                const originalEnd = parseISO(
                    draggingAllocation.isLeave
                        ? allocation.end_date
                        : allocation.end_date,
                );
                const duration = differenceInDays(originalEnd, originalStart);

                const newStart = startOfDay(dragPreviewStart);
                const newEnd = addDays(newStart, duration);

                console.log(
                    "Drag ended. Offset:",
                    dragOffset,
                    "Original:",
                    format(originalStart, "yyyy-MM-dd"),
                    "New:",
                    format(newStart, "yyyy-MM-dd"),
                );

                try {
                    const csrfToken =
                        document.querySelector('meta[name="csrf-token"]')
                            ?.content || "";

                    if (draggingAllocation.isLeave) {
                        // Update annual leave
                        const response = await fetch(
                            `/annual-leave/${allocation.id}`,
                            {
                                method: "PUT",
                                credentials: "same-origin",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-Requested-With": "XMLHttpRequest",
                                    Accept: "application/json",
                                    "X-CSRF-TOKEN": csrfToken,
                                },
                                body: JSON.stringify({
                                    start_date: format(newStart, "yyyy-MM-dd"),
                                    end_date: format(newEnd, "yyyy-MM-dd"),
                                    days_count: duration + 1,
                                }),
                            },
                        );

                        if (response.ok) {
                            const responseData = await response.json();
                            console.log("✅ [DragMove] Leave updated successfully", responseData);

                            // Update via optimistic state - no reload needed
                            if (onOptimisticLeave && responseData) {
                                console.log("✨ [DragMove] Updating leave in optimistic state");
                                onOptimisticLeave(responseData);
                            }

                            // Clear dragging state immediately
                            setDraggingAllocation(null);
                            setDragOffset(0);
                            setDragPreviewStart(null);
                            setDragOriginalStartDate(null);
                            setDragGrabOffset(0);
                            dragStartPos.current = null;
                            hasMoved.current = false;
                            console.log("🟢 [DragMove] Drag complete, no reload needed");
                        } else {
                            const errorData = await response.json();
                            console.error("Failed to move leave:", errorData);
                            alert("Failed to move leave. Please try again.");
                            // Clear dragging state on error too
                            setDraggingAllocation(null);
                            setDragOffset(0);
                            setDragPreviewStart(null);
                            setDragOriginalStartDate(null);
                            dragStartPos.current = null;
                            hasMoved.current = false;
                        }
                    } else {
                        // Update project allocation
                        const updateData = {
                            start_date: format(newStart, "yyyy-MM-dd"),
                            end_date: format(newEnd, "yyyy-MM-dd"),
                        };
                        console.log(
                            "Updating allocation:",
                            allocation.id,
                            "with data:",
                            updateData,
                        );

                        const response = await fetch(
                            `/allocations/${allocation.id}`,
                            {
                                method: "PUT",
                                credentials: "same-origin",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-Requested-With": "XMLHttpRequest",
                                    Accept: "application/json",
                                    "X-CSRF-TOKEN": csrfToken,
                                },
                                body: JSON.stringify(updateData),
                            },
                        );

                        console.log(
                            "Response status:",
                            response.status,
                            "OK:",
                            response.ok,
                        );

                        if (response.ok) {
                            const responseData = await response.json();
                            console.log("✅ [DragMove] Allocation updated successfully:", responseData);

                            // Update via optimistic state - no reload needed
                            if (onOptimisticAllocation && responseData) {
                                console.log("✨ [DragMove] Updating allocation in optimistic state");
                                onOptimisticAllocation(responseData);
                            }

                            // Clear dragging state immediately
                            setDraggingAllocation(null);
                            setDragOffset(0);
                            setDragPreviewStart(null);
                            setDragOriginalStartDate(null);
                            setDragGrabOffset(0);
                            dragStartPos.current = null;
                            hasMoved.current = false;
                            console.log("🟢 [DragMove] Drag complete, no reload needed");
                        } else {
                            const errorData = await response
                                .json()
                                .catch(() => ({ message: "Unknown error" }));
                            console.error(
                                "Failed to move allocation. Status:",
                                response.status,
                                "Error:",
                                errorData,
                            );
                            alert(
                                `Failed to move allocation: ${errorData.message || "Please try again."}`,
                            );
                            // Clear dragging state on error too
                            setDraggingAllocation(null);
                            setDragOffset(0);
                            setDragPreviewStart(null);
                            setDragOriginalStartDate(null);
                            dragStartPos.current = null;
                            hasMoved.current = false;
                        }
                    }
                } catch (error) {
                    console.error("Error moving allocation. Exception:", error);
                    alert(
                        `Error moving allocation: ${error.message || "Please try again."}`,
                    );
                    // Clear dragging state on exception too
                    setDraggingAllocation(null);
                    setDragOffset(0);
                    setDragPreviewStart(null);
                    setDragOriginalStartDate(null);
                    dragStartPos.current = null;
                    hasMoved.current = false;
                }
            } else {
                // No offset, just clear dragging state
                setDraggingAllocation(null);
                setDragOffset(0);
                setDragPreviewStart(null);
                setDragOriginalStartDate(null);
                setDragGrabOffset(0);
                dragStartPos.current = null;
                hasMoved.current = false;
            }
        };

        if (isActivelyDragging) {
            document.addEventListener("mousemove", handleDragMove);
            document.addEventListener("mouseup", handleDragEnd);

            return () => {
                document.removeEventListener("mousemove", handleDragMove);
                document.removeEventListener("mouseup", handleDragEnd);
            };
        }
    }, [isActivelyDragging, draggingAllocation, dragOffset, dragPreviewStart, dragGrabOffset, days]);

    // Helper function to merge adjacent allocations with the same project (or adjacent leave)
    const getMergedAllocationSpan = (allocation, allAllocations, isLeave = false) => {
        // Sort allocations by start date
        const sortedAllocations = [...allAllocations]
            .filter(a => {
                if (isLeave) {
                    // For leave, merge all leave records (they're already grouped by user)
                    return true;
                } else if (allocation.type === 'project') {
                    return a.project_id === allocation.project_id && a.type === 'project';
                } else {
                    // For SLA/misc, match by type and title
                    return a.type === allocation.type && a.title === allocation.title;
                }
            })
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        if (sortedAllocations.length <= 1) {
            return null; // No merging needed
        }

        // Find the continuous sequence this allocation belongs to
        let mergedStart = parseISO(allocation.start_date);
        let mergedEnd = parseISO(allocation.end_date);
        let changed = true;

        // Keep expanding the range until no more adjacent allocations are found
        while (changed) {
            changed = false;
            for (const otherAlloc of sortedAllocations) {
                if (otherAlloc.id === allocation.id) continue; // Skip self

                const otherStart = parseISO(otherAlloc.start_date);
                const otherEnd = parseISO(otherAlloc.end_date);

                // Check if this allocation is adjacent to our merged range
                // Adjacent means: end of one is the day before start of the other, OR they overlap
                const dayAfterOtherEnd = addDays(otherEnd, 1);
                const dayAfterMergedEnd = addDays(mergedEnd, 1);

                const isAdjacent =
                    isSameDay(dayAfterOtherEnd, mergedStart) ||  // other ends day before merged starts
                    isSameDay(dayAfterMergedEnd, otherStart) ||  // merged ends day before other starts
                    (otherStart <= mergedEnd && otherEnd >= mergedStart); // overlapping

                if (isAdjacent) {
                    const oldStart = mergedStart;
                    const oldEnd = mergedEnd;

                    // Extend the merged range
                    if (otherStart < mergedStart) mergedStart = otherStart;
                    if (otherEnd > mergedEnd) mergedEnd = otherEnd;

                    // Check if we actually changed anything
                    if (!isSameDay(oldStart, mergedStart) || !isSameDay(oldEnd, mergedEnd)) {
                        changed = true;
                    }
                }
            }
        }

        return { start: mergedStart, end: mergedEnd };
    };

    const renderAllocationBlock = (
        allocation,
        firstDay,
        isLeave = false,
        allocIndex = 0,
        allAllocations = [],
    ) => {
        // Strict check for dragging state
        const isThisBeingDragged =
            draggingAllocation &&
            draggingAllocation.allocation.id === allocation.id &&
            draggingAllocation.isLeave === isLeave &&
            allocation.start_date === dragOriginalStartDate; // Only apply preview if data hasn't updated

        let startDate = startOfDay(
            parseISO(isLeave ? allocation.start_date : allocation.start_date),
        );
        let endDate = startOfDay(
            parseISO(isLeave ? allocation.end_date : allocation.end_date),
        );

        // Try to merge with adjacent allocations (for both allocations and leave)
        const mergedSpan = getMergedAllocationSpan(allocation, allAllocations, isLeave);
        if (mergedSpan) {
            // Check if THIS allocation is the first one in the merged sequence
            // Only render from the earliest allocation's start date
            const isFirstInSequence = isSameDay(startDate, mergedSpan.start);
            if (!isFirstInSequence) {
                return null; // Don't render - will be rendered from the first allocation
            }
            // Use the merged span for rendering
            startDate = mergedSpan.start;
            endDate = mergedSpan.end;
        }

        const firstDayDate = startOfDay(firstDay);

        // Check if this allocation starts on this day
        const startsHere = isSameDay(startDate, firstDayDate);
        if (!startsHere) return null;

        // Calculate how many days to span
        const lastDayDate = startOfDay(days[days.length - 1]);
        const effectiveEndDate = endDate > lastDayDate ? lastDayDate : endDate;
        let daysToSpan = Math.min(
            differenceInDays(effectiveEndDate, startDate) + 1,
            days.length,
        );
        const dayIndex = days.findIndex((d) => isSameDay(d, firstDayDate));

        // Use preview days if this allocation is being resized
        // Only apply preview if the allocation hasn't been updated yet (start_date still matches original)
        const isBeingResized =
            resizingAllocation &&
            resizingAllocation.allocation.id === allocation.id &&
            allocation.start_date === resizeOriginalStartDate;
        let startOffsetDays = 0;
        if (isBeingResized) {
            daysToSpan = resizePreviewDays;
            startOffsetDays = resizePreviewStartOffset;
        }

        // Calculate z-index to ensure proper stacking (higher index = on top)
        const zIndex = 10 + allocIndex;

        if (isLeave) {
            // Hide the original block completely when being dragged (preview will show instead)
            if (isThisBeingDragged) {
                return null;
            }

            if (!startsHere) return null;

            return (
                <div
                    key={allocation.id}
                    className={`absolute top-1 left-1 right-1 h-[calc(100%-0.5rem)] rounded-md bg-orange-500 text-white text-xs px-1 py-1 font-medium shadow-sm flex items-center group/alloc overflow-hidden ${canModifyAllocations ? "cursor-move" : ""} ${isBeingResized ? "opacity-70" : ""}`}
                    style={{
                        width: `calc(${daysToSpan * 100}% - 0.5rem)`,
                        transform: isBeingResized ? `translateX(${startOffsetDays * 60}px)` : 'none',
                        transition: isBeingResized
                            ? "none"
                            : "width 0.1s ease-out, transform 0.1s ease-out",
                        zIndex: zIndex,
                    }}
                    onMouseDown={(e) => {
                        // Don't interfere with resize handles
                        if (
                            e.target.classList.contains("cursor-ew-resize") ||
                            e.target.closest(".cursor-ew-resize")
                        ) {
                            return;
                        }
                        e.stopPropagation();
                        e.preventDefault();
                        if (!isBeingResized) {
                            handleDragAllocationStart(e, allocation, true);
                        }
                    }}
                    title={`Leave: ${format(startDate, "MMM d")} - ${format(addDays(startDate, daysToSpan - 1), "MMM d")}${canModifyAllocations ? " - Drag to move, drag edges to resize" : ""}`}
                >
                    {canModifyAllocations && (
                        <div
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize"
                            style={{ zIndex: 20 }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleResizeStart(e, allocation, true, "left");
                            }}
                        />
                    )}
                    <span className="flex-1 text-center flex items-center justify-center gap-1 overflow-hidden">
                        {daysToSpan > 1 && <Umbrella className="h-3 w-3 flex-shrink-0" />}
                        <span className="truncate">Leave</span>
                    </span>
                    {canModifyAllocations && (
                        <div
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                            style={{ zIndex: 20 }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleResizeStart(e, allocation, true, "right");
                            }}
                        />
                    )}
                </div>
            );
        }

        const displayText =
            allocation.project?.name || allocation.title || allocation.type;
        const bgColor = allocation.project?.color || "#8b5cf6";

        // Hide the original block completely when being dragged (preview will show instead)
        if (isThisBeingDragged) {
            return null;
        }

        return (
            <div
                key={allocation.id}
                className={`absolute top-1 left-1 right-1 h-[calc(100%-0.5rem)] rounded-md text-white text-xs px-2 py-1 font-medium shadow-sm flex items-center hover:shadow-md transition-shadow group/alloc ${canModifyAllocations ? "cursor-move" : ""} ${isBeingResized ? "opacity-70" : ""}`}
                style={{
                    width: `calc(${daysToSpan * 100}% - 0.5rem)`,
                    backgroundColor: bgColor,
                    transform: isBeingResized ? `translateX(${startOffsetDays * 60}px)` : 'none',
                    transition: isBeingResized ? "none" : "width 0.1s ease-out, transform 0.1s ease-out",
                    zIndex: zIndex,
                }}
                onMouseDown={(e) => {
                    // Don't interfere with resize handles
                    if (
                        e.target.classList.contains("cursor-ew-resize") ||
                        e.target.closest(".cursor-ew-resize")
                    ) {
                        return;
                    }
                    e.stopPropagation();
                    e.preventDefault();
                    if (!isBeingResized) {
                        handleDragAllocationStart(e, allocation, false);
                    }
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isBeingResized && canModifyAllocations) {
                        onEditAllocation(allocation);
                    }
                }}
                title={`${displayText}: ${format(startDate, "MMM d")} - ${format(addDays(startDate, daysToSpan - 1), "MMM d")} (${allocation.days_per_week} days/week)${canModifyAllocations ? " - Drag to move, drag edges to resize" : ""}`}
            >
                {canModifyAllocations && (
                    <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize"
                        style={{ zIndex: 20 }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleResizeStart(e, allocation, false, "left");
                        }}
                    />
                )}
                <span className="flex-1 truncate px-1">
                    {daysToSpan === 1
                        ? // For 1-day allocations, just show "1d"
                          "1d"
                        : daysToSpan === 2
                          ? // For 2-day allocations, just show "2d"
                            "2d"
                          : daysToSpan === 3
                            ? // For 3-day allocations, show abbreviated name
                              `${displayText.substring(0, 6)}${displayText.length > 6 ? "..." : ""}`
                            : // For 4+ day allocations, show more of the name + days/week
                              `${displayText} - ${allocation.days_per_week}d/w`}
                </span>
                {canModifyAllocations && (
                    <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                        style={{ zIndex: 20 }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleResizeStart(e, allocation, false, "right");
                        }}
                    />
                )}
            </div>
        );
    };

    // Show empty state when no employees in people view
    if (rows.length === 0) {
        return (
            <div className="relative h-full flex flex-col items-center justify-center">
                <div className="text-center">
                    <div className="text-foreground text-lg font-medium">
                        {viewMode === "people"
                            ? "No employees yet"
                            : "No projects yet"}
                    </div>
                    <div className="text-muted-foreground text-sm mt-1">
                        {viewMode === "people"
                            ? "Add employees to start planning and tracking capacity"
                            : "Add projects to start assigning work"}
                    </div>
                    <button
                        onClick={viewMode === "people" ? onAddPerson : onAddProject}
                        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors inline-flex items-center gap-2 font-medium cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        {viewMode === "people" ? "Add Employee" : "Add Project"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full flex flex-col">
            <div ref={ref} className="relative flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar" style={{ minWidth: 0 }}>
                {/* Background columns extending to bottom */}
                <div className="absolute inset-0 flex pointer-events-none">
                    <div
                        className="sticky left-0 z-0"
                        style={{
                            backgroundColor: "hsl(var(--card))",
                            width: "275px",
                            minWidth: "275px",
                            maxWidth: "275px",
                            boxSizing: "border-box",
                        }}
                    />
                    <div
                        className="flex-1"
                        style={{
                            backgroundColor: "hsl(var(--background))",
                        }}
                    />
                </div>

                {/* Today vertical marker line */}
                {(() => {
                    const todayIndex = days.findIndex(day => isSameDay(day, today));
                    if (todayIndex === -1) return null;
                    const leftPosition = 275 + (todayIndex * 60) + 30; // 275px sidebar + day columns + center of cell
                    return (
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-20 pointer-events-none"
                            style={{ left: `${leftPosition}px` }}
                        />
                    );
                })()}

                <table
                    className="relative z-10"
                    style={{
                        borderSpacing: 0,
                        borderCollapse: "separate",
                        minWidth: `${277 + (days.length * 60)}px`,
                        width: `${277 + (days.length * 60)}px`,
                        height: "100%",
                        tableLayout: "fixed",
                    }}
                >
                    {/* Month headers */}
                    <thead>
                        <tr>
                            <th
                                style={{
                                    backgroundColor: "hsl(var(--muted))",
                                    borderRight: "2px solid hsl(var(--border))",
                                    width: "275px",
                                    minWidth: "275px",
                                    maxWidth: "275px",
                                }}
                                className="sticky left-0 z-30 px-4 py-2"
                            >
                                <div className="flex flex-col gap-2">
                                    {/* View Mode Toggle */}
                                    <div className="flex items-center gap-0.5 bg-muted rounded p-0.5">
                                        <button
                                            onClick={() => onViewModeChange("people")}
                                            className={`px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                                                viewMode === "people"
                                                    ? "bg-background text-foreground"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                            title="View by people"
                                        >
                                            People
                                        </button>
                                        <button
                                            onClick={() => onViewModeChange("project")}
                                            className={`px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                                                viewMode === "project"
                                                    ? "bg-background text-foreground"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                            title="View by projects"
                                        >
                                            Projects
                                        </button>
                                    </div>

                                    {/* Sort and Compress controls */}
                                    <div className="flex items-center gap-1">
                                        {/* Sort Toggle */}
                                        <div className="flex items-center gap-0.5 bg-muted rounded p-0.5">
                                            <button
                                                onClick={() => onSortModeChange("manual")}
                                                className={`p-1 rounded transition-colors cursor-pointer ${
                                                    sortMode === "manual"
                                                        ? "bg-background text-foreground"
                                                        : "text-muted-foreground hover:text-foreground"
                                                }`}
                                                title="Default sort order"
                                            >
                                                <ArrowUpDown className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => onSortModeChange("name")}
                                                className={`p-1 rounded transition-colors cursor-pointer ${
                                                    sortMode === "name"
                                                        ? "bg-background text-foreground"
                                                        : "text-muted-foreground hover:text-foreground"
                                                }`}
                                                title="Sort by name alphabetically"
                                            >
                                                <ArrowDownAZ className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        {/* Expand/Compress Toggle */}
                                        <button
                                            onClick={onToggleCompress}
                                            className="p-1 bg-muted hover:bg-muted/80 rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                                            title={
                                                isCompressed
                                                    ? "Expand all resources"
                                                    : "Compress all resources"
                                            }
                                        >
                                            {isCompressed ? (
                                                <ChevronsDownUp className="h-3.5 w-3.5" />
                                            ) : (
                                                <ChevronsUpDown className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </th>
                            {Object.entries(monthGroups).map(
                                ([monthKey, monthDays], idx) => (
                                    <th
                                        key={monthKey}
                                        colSpan={monthDays.length}
                                        style={{
                                            backgroundColor: "hsl(var(--muted))",
                                        }}
                                        className="text-center px-3 py-2 font-semibold text-xs text-foreground uppercase tracking-wider"
                                    >
                                        {monthKey}
                                    </th>
                                ),
                            )}
                        </tr>
                        {/* Date headers */}
                        <tr>
                            <th
                                style={{
                                    backgroundColor: "hsl(var(--muted))",
                                    borderRight: "2px solid hsl(var(--border))",
                                    width: "275px",
                                    minWidth: "275px",
                                    maxWidth: "275px",
                                }}
                                className="px-4 py-2 text-left sticky left-0 z-30"
                            ></th>

                            {/* Loading indicator for previous dates */}
                            {isLoadingPrevious && (
                                <th
                                    key="loading-prev"
                                    style={{
                                        backgroundColor: "hsl(var(--muted))",
                                        borderLeft: "1px solid hsl(var(--border) / 0.5)",
                                        width: "60px",
                                        minWidth: "60px",
                                        maxWidth: "60px",
                                    }}
                                    className="px-1 py-2 text-center"
                                >
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                    </div>
                                </th>
                            )}

                            {days.map((day, idx) => {
                                const isToday = isSameDay(day, today);
                                const isWeekend =
                                    getDay(day) === 0 || getDay(day) === 6;

                                return (
                                    <th
                                        key={idx}
                                        style={{
                                            backgroundColor: "hsl(var(--muted))",
                                            borderLeft:
                                                idx === 0
                                                    ? "none"
                                                    : "1px solid hsl(var(--border) / 0.5)",
                                            width: "60px",
                                            minWidth: "60px",
                                            maxWidth: "60px",
                                        }}
                                        className={`px-1 py-2 text-center font-semibold text-[0.65rem] ${
                                            isToday
                                                ? "text-primary"
                                                : "text-foreground"
                                        }`}
                                    >
                                        <div className="uppercase tracking-wide flex flex-col items-center gap-1">
                                            <span>{format(day, "d MMM")}</span>
                                        </div>
                                    </th>
                                );
                            })}

                            {/* Loading indicator for next dates */}
                            {isLoadingNext && (
                                <th
                                    key="loading-next"
                                    style={{
                                        backgroundColor: "hsl(var(--muted))",
                                        borderLeft: "1px solid hsl(var(--border) / 0.5)",
                                        width: "60px",
                                        minWidth: "60px",
                                        maxWidth: "60px",
                                    }}
                                    className="px-1 py-2 text-center"
                                >
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                    </div>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIdx) => {
                                const isExpanded = expandedRows[row.id];
                                const rowProjects = getRowProjects(row);

                                return (
                                    <>
                                        {/* Main row */}
                                        <tr
                                            key={row.id}
                                            className="group"
                                            style={{
                                                borderBottom: isExpanded
                                                    ? "1px solid hsl(var(--border) / 0.3)"
                                                    : "2px solid hsl(var(--border))"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "hsl(var(--muted) / 0.5)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "";
                                            }}
                                        >
                                            <td
                                                style={{
                                                    backgroundColor:
                                                        "hsl(var(--card))",
                                                    borderRight:
                                                        "2px solid hsl(var(--border))",
                                                    borderBottom: isExpanded
                                                        ? "none"
                                                        : "2px solid hsl(var(--border))",
                                                    width: "274px",
                                                    minWidth: "274px",
                                                    maxWidth: "274px",
                                                }}
                                                className="px-4 py-3 sticky left-0 z-20"
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = "hsl(var(--muted) / 0.5)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = "hsl(var(--card))";
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() =>
                                                            toggleRow(row.id)
                                                        }
                                                        className="p-1 hover:bg-muted/50 rounded transition-colors"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </button>
                                                    <div className="w-7 h-7 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-foreground font-semibold text-xs">
                                                        {row.name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>
                                                    {editingEmployeeName?.id === row.id ? (
                                                        <input
                                                            type="text"
                                                            value={editingEmployeeName.name}
                                                            onChange={(e) => setEditingEmployeeName({ ...editingEmployeeName, name: e.target.value })}
                                                            onKeyDown={async (e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    try {
                                                                        await fetch(`/api/employees/${row.id}`, {
                                                                            method: 'PATCH',
                                                                            headers: {
                                                                                'Content-Type': 'application/json',
                                                                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                                                                            },
                                                                            body: JSON.stringify({ name: editingEmployeeName.name }),
                                                                        });
                                                                        router.reload({ preserveScroll: true });
                                                                    } catch (error) {
                                                                        console.error('Error renaming employee:', error);
                                                                    }
                                                                    setEditingEmployeeName(null);
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingEmployeeName(null);
                                                                }
                                                            }}
                                                            onBlur={() => setEditingEmployeeName(null)}
                                                            className="font-medium text-sm text-foreground bg-background border border-border rounded px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-primary"
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <span className="font-medium text-sm text-foreground">
                                                            {row.name}
                                                        </span>
                                                    )}
                                                    {viewMode === "people" && !row.isStatusGroup && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setEmployeeMenu({
                                                                    employee: row,
                                                                    x: rect.left,
                                                                    y: rect.bottom + 4,
                                                                });
                                                            }}
                                                            className="ml-auto p-1 rounded hover:bg-muted/70 cursor-pointer"
                                                            title="More options"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Loading cell for previous dates */}
                                            {isLoadingPrevious && (
                                                <td
                                                    key={`${row.id}-loading-prev`}
                                                    style={{
                                                        borderLeft: "1px solid hsl(var(--border) / 0.3)",
                                                        borderBottom: isExpanded
                                                            ? "none"
                                                            : "2px solid hsl(var(--border))",
                                                    }}
                                                    className="h-[44px] relative bg-muted/20"
                                                />
                                            )}

                                            {days.map((day, dayIdx) => {
                                                const isToday = isSameDay(
                                                    day,
                                                    today,
                                                );
                                                const isWeekend =
                                                    getDay(day) === 0 ||
                                                    getDay(day) === 6;

                                                return (
                                                    <td
                                                        key={dayIdx}
                                                        style={{
                                                            borderLeft:
                                                                dayIdx === 0
                                                                    ? "none"
                                                                    : "1px solid hsl(var(--border) / 0.3)",
                                                            borderBottom: isExpanded
                                                                ? "none"
                                                                : "2px solid hsl(var(--border))",
                                                        }}
                                                        className={`h-[44px] relative ${
                                                            isToday
                                                                ? "bg-primary/5"
                                                                : ""
                                                        }`}
                                                    ></td>
                                                );
                                            })}

                                            {/* Loading cell for next dates */}
                                            {isLoadingNext && (
                                                <td
                                                    key={`${row.id}-loading-next`}
                                                    style={{
                                                        borderLeft: "1px solid hsl(var(--border) / 0.3)",
                                                        borderBottom: isExpanded
                                                            ? "none"
                                                            : "2px solid hsl(var(--border))",
                                                    }}
                                                    className="h-[44px] relative bg-muted/20"
                                                />
                                            )}
                                        </tr>

                                        {/* Sub-rows (projects) */}
                                        {isExpanded &&
                                            rowProjects.map(
                                                (project, projIdx) => (
                                                    <tr
                                                        key={`${row.id}-${project.id}`}
                                                        className="group"
                                                        style={{
                                                            borderBottom: projIdx === rowProjects.length - 1
                                                                ? "2px solid hsl(var(--border))"
                                                                : "none"
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = "hsl(var(--muted) / 0.4)";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = "";
                                                        }}
                                                    >
                                                        <td
                                                            style={{
                                                                backgroundColor:
                                                                    "hsl(var(--card))",
                                                                borderRight:
                                                                    "2px solid hsl(var(--border))",
                                                                borderBottom: projIdx === rowProjects.length - 1
                                                                    ? "2px solid hsl(var(--border))"
                                                                    : "none",
                                                                width: "274px",
                                                                minWidth: "274px",
                                                                maxWidth: "274px",
                                                            }}
                                                            className="pl-12 pr-4 py-2 sticky left-0 z-20"
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = "hsl(var(--muted) / 0.4)";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = "hsl(var(--card))";
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-2.5 w-full">
                                                                {project.type ===
                                                                "leave" ? (
                                                                    <div
                                                                        className="w-3 h-3 rounded-full"
                                                                        style={{
                                                                            backgroundColor:
                                                                                "#f97316",
                                                                        }}
                                                                    ></div>
                                                                ) : project.color ? (
                                                                    <div
                                                                        className="w-3 h-3 rounded-full"
                                                                        style={{
                                                                            backgroundColor:
                                                                                project.color,
                                                                        }}
                                                                    ></div>
                                                                ) : (
                                                                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                                                                )}
                                                                <span className="text-xs text-foreground font-normal">
                                                                    {
                                                                        project.name
                                                                    }
                                                                </span>
                                                                <span className="text-xs text-muted-foreground ml-auto">
                                                                    {
                                                                        project.count
                                                                    }
                                                                </span>
                                                                {/* Assign person button (project view only) */}
                                                                {viewMode === "project" && canModifyAllocations && project.type !== "leave" && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            const viewportHeight = window.innerHeight;
                                                                            const spaceBelow = viewportHeight - rect.bottom;
                                                                            const menuHeight = 350;

                                                                            setShowPersonMenu({
                                                                                projectId: project.id,
                                                                                x: rect.left,
                                                                                y: spaceBelow < menuHeight ? rect.top - menuHeight : rect.bottom,
                                                                            });
                                                                            setPersonSearchQuery("");
                                                                        }}
                                                                        className="ml-2 p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                                        title="Assign person"
                                                                    >
                                                                        <Plus className="h-3 w-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        {days.map(
                                                            (day, dayIdx) => {
                                                                const isToday =
                                                                    isSameDay(
                                                                        day,
                                                                        today,
                                                                    );
                                                                const isWeekend =
                                                                    getDay(
                                                                        day,
                                                                    ) === 0 ||
                                                                    getDay(
                                                                        day,
                                                                    ) === 6;
                                                                const cellKey = `${row.id}-${project.id}-${dayIdx}`;
                                                                const isHovered =
                                                                    hoveredCell ===
                                                                    cellKey;

                                                                // Check if this cell already has an allocation
                                                                const hasAllocation =
                                                                    project.allocations.some(
                                                                        (
                                                                            alloc,
                                                                        ) => {
                                                                            const allocStart =
                                                                                startOfDay(
                                                                                    parseISO(
                                                                                        project.type ===
                                                                                            "leave"
                                                                                            ? alloc.start_date
                                                                                            : alloc.start_date,
                                                                                    ),
                                                                                );
                                                                            const allocEnd =
                                                                                startOfDay(
                                                                                    parseISO(
                                                                                        project.type ===
                                                                                            "leave"
                                                                                            ? alloc.end_date
                                                                                            : alloc.end_date,
                                                                                    ),
                                                                                );
                                                                            return isWithinInterval(
                                                                                startOfDay(
                                                                                    day,
                                                                                ),
                                                                                {
                                                                                    start: allocStart,
                                                                                    end: allocEnd,
                                                                                },
                                                                            );
                                                                        },
                                                                    );

                                                                // Check if this cell is part of the drag preview (create new allocation)
                                                                const isDragPreview =
                                                                    isDraggingNew &&
                                                                    dragRowId ===
                                                                        row.id &&
                                                                    dragProjectId ===
                                                                        project.id &&
                                                                    dragStart &&
                                                                    dragEnd &&
                                                                    !hasAllocation &&
                                                                    isWithinInterval(
                                                                        startOfDay(
                                                                            day,
                                                                        ),
                                                                        {
                                                                            start: startOfDay(
                                                                                dragStart <
                                                                                    dragEnd
                                                                                    ? dragStart
                                                                                    : dragEnd,
                                                                            ),
                                                                            end: startOfDay(
                                                                                dragStart <
                                                                                    dragEnd
                                                                                    ? dragEnd
                                                                                    : dragStart,
                                                                            ),
                                                                        },
                                                                    );

                                                                // Check if this cell is part of a MOVE drag preview
                                                                let isDragMovePreview = false;
                                                                if (draggingAllocation && dragPreviewStart) {
                                                                    const draggedAlloc = draggingAllocation.allocation;
                                                                    const originalStart = parseISO(
                                                                        draggingAllocation.isLeave
                                                                            ? draggedAlloc.start_date
                                                                            : draggedAlloc.start_date,
                                                                    );
                                                                    const originalEnd = parseISO(
                                                                        draggingAllocation.isLeave
                                                                            ? draggedAlloc.end_date
                                                                            : draggedAlloc.end_date,
                                                                    );
                                                                    const duration = differenceInDays(originalEnd, originalStart);
                                                                    const previewEnd = addDays(dragPreviewStart, duration);

                                                                    // Check if preview applies to this row/project
                                                                    const appliesToThisRow = draggingAllocation.isLeave
                                                                        ? project.type === "leave" && draggedAlloc.employee_id === row.id
                                                                        : project.id === draggedAlloc.project_id && draggedAlloc.employee_id === row.id;

                                                                    if (appliesToThisRow) {
                                                                        // Check if this day is within the preview range
                                                                        isDragMovePreview = isWithinInterval(startOfDay(day), {
                                                                            start: startOfDay(dragPreviewStart),
                                                                            end: startOfDay(previewEnd),
                                                                        });
                                                                    }
                                                                }

                                                                return (
                                                                    <td
                                                                        key={
                                                                            dayIdx
                                                                        }
                                                                        style={{
                                                                            borderLeft:
                                                                                dayIdx ===
                                                                                0
                                                                                    ? "none"
                                                                                    : "1px solid hsl(var(--border) / 0.3)",
                                                                            borderBottom: projIdx === rowProjects.length - 1
                                                                                ? "2px solid hsl(var(--border))"
                                                                                : "none",
                                                                            outline: (canModifyAllocations && isHovered && !hasAllocation && !isDraggingNew && !resizingAllocation && !draggingAllocation) ? "2px solid hsl(var(--primary) / 0.6)" : "none",
                                                                            outlineOffset: "-2px",
                                                                        }}
                                                                        className={`relative h-[38px] ${canModifyAllocations && !draggingAllocation ? "cursor-pointer" : ""} select-none ${
                                                                            isToday
                                                                                ? "bg-primary/5"
                                                                                : ""
                                                                        } ${isDragPreview ? "bg-primary/10" : ""} ${isDragMovePreview && !hasAllocation ? "bg-primary/15" : ""}`}
                                                                        onMouseEnter={() => {
                                                                            if (
                                                                                !resizingAllocation && !draggingAllocation
                                                                            ) {
                                                                                setHoveredCell(
                                                                                    cellKey,
                                                                                );
                                                                                handleDragNewMove(
                                                                                    day,
                                                                                );
                                                                            }
                                                                        }}
                                                                        onMouseLeave={() =>
                                                                            setHoveredCell(
                                                                                null,
                                                                            )
                                                                        }
                                                                        onMouseDown={(
                                                                            e,
                                                                        ) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            // Start drag to create
                                                                            if (
                                                                                !hasAllocation &&
                                                                                !resizingAllocation &&
                                                                                !isDraggingNew &&
                                                                                !draggingAllocation &&
                                                                                !isProcessingDrag.current
                                                                            ) {
                                                                                handleDragNewStart(
                                                                                    day,
                                                                                    row.id,
                                                                                    project.id,
                                                                                );
                                                                            }
                                                                        }}
                                                                    >
                                                                        {project.allocations.map(
                                                                            (
                                                                                alloc,
                                                                                allocIndex,
                                                                            ) => {
                                                                                if (
                                                                                    project.type ===
                                                                                    "leave"
                                                                                ) {
                                                                                    return renderAllocationBlock(
                                                                                        alloc,
                                                                                        day,
                                                                                        true,
                                                                                        allocIndex,
                                                                                        project.allocations,
                                                                                    );
                                                                                } else {
                                                                                    return renderAllocationBlock(
                                                                                        alloc,
                                                                                        day,
                                                                                        false,
                                                                                        allocIndex,
                                                                                        project.allocations,
                                                                                    );
                                                                                }
                                                                            },
                                                                        )}
                                                                        {/* Render drag MOVE preview */}
                                                                        {draggingAllocation &&
                                                                            dragPreviewStart &&
                                                                            (() => {
                                                                                const draggedAlloc =
                                                                                    draggingAllocation.allocation;
                                                                                const originalStart =
                                                                                    parseISO(
                                                                                        draggingAllocation.isLeave
                                                                                            ? draggedAlloc.start_date
                                                                                            : draggedAlloc.start_date,
                                                                                    );
                                                                                const originalEnd =
                                                                                    parseISO(
                                                                                        draggingAllocation.isLeave
                                                                                            ? draggedAlloc.end_date
                                                                                            : draggedAlloc.end_date,
                                                                                    );
                                                                                const duration =
                                                                                    differenceInDays(
                                                                                        originalEnd,
                                                                                        originalStart,
                                                                                    );
                                                                                const previewEnd =
                                                                                    addDays(
                                                                                        dragPreviewStart,
                                                                                        duration,
                                                                                    );

                                                                                // Check if this cell is the first day of the preview
                                                                                const isPreviewStart =
                                                                                    isSameDay(
                                                                                        day,
                                                                                        dragPreviewStart,
                                                                                    );

                                                                                // Check if preview applies to this row/project
                                                                                const appliesToThisRow =
                                                                                    draggingAllocation.isLeave
                                                                                        ? project.type ===
                                                                                              "leave" &&
                                                                                          draggedAlloc.employee_id ===
                                                                                              row.id
                                                                                        : project.id ===
                                                                                              draggedAlloc.project_id &&
                                                                                          draggedAlloc.employee_id ===
                                                                                              row.id;

                                                                                if (
                                                                                    isPreviewStart &&
                                                                                    appliesToThisRow
                                                                                ) {
                                                                                    const spanDays =
                                                                                        duration +
                                                                                        1;
                                                                                    const bgColor =
                                                                                        draggingAllocation.isLeave
                                                                                            ? "#f97316"
                                                                                            : project.color ||
                                                                                              "#3b82f6";

                                                                                    // Render preview that looks identical to actual allocation
                                                                                    if (draggingAllocation.isLeave) {
                                                                                        return (
                                                                                            <div
                                                                                                className="absolute top-1 left-1 right-1 h-[calc(100%-0.5rem)] rounded-md bg-orange-500 text-white text-xs px-1 py-1 font-medium shadow-sm flex items-center pointer-events-none z-30 opacity-80"
                                                                                                style={{
                                                                                                    width: `calc(${spanDays * 100}% - 0.5rem)`,
                                                                                                }}
                                                                                            >
                                                                                                <span className="flex-1 text-center flex items-center justify-center gap-1 overflow-hidden">
                                                                                                    {spanDays > 1 && <Umbrella className="h-3 w-3 flex-shrink-0" />}
                                                                                                    <span className="truncate">Leave</span>
                                                                                                </span>
                                                                                            </div>
                                                                                        );
                                                                                    } else {
                                                                                        const displayText = project.name || draggedAlloc.title || draggedAlloc.type;
                                                                                        return (
                                                                                            <div
                                                                                                className="absolute top-1 left-1 right-1 h-[calc(100%-0.5rem)] rounded-md text-white text-xs px-2 py-1 font-medium shadow-sm flex items-center pointer-events-none z-30 opacity-80"
                                                                                                style={{
                                                                                                    width: `calc(${spanDays * 100}% - 0.5rem)`,
                                                                                                    backgroundColor: bgColor,
                                                                                                }}
                                                                                            >
                                                                                                <span className="flex-1 truncate px-1">
                                                                                                    {spanDays === 1
                                                                                                        ? "1d"
                                                                                                        : spanDays === 2
                                                                                                          ? "2d"
                                                                                                          : spanDays === 3
                                                                                                            ? `${displayText.substring(0, 6)}${displayText.length > 6 ? "..." : ""}`
                                                                                                            : `${displayText} - ${draggedAlloc.days_per_week}d/w`}
                                                                                                </span>
                                                                                            </div>
                                                                                        );
                                                                                    }
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                        {/* Render drag preview as single continuous block only on first day */}
                                                                        {isDragPreview &&
                                                                            isSameDay(
                                                                                day,
                                                                                startOfDay(
                                                                                    dragStart <
                                                                                        dragEnd
                                                                                        ? dragStart
                                                                                        : dragEnd,
                                                                                ),
                                                                            ) &&
                                                                            (() => {
                                                                                const previewStartDay =
                                                                                    dragStart <
                                                                                    dragEnd
                                                                                        ? dragStart
                                                                                        : dragEnd;
                                                                                const previewEndDay =
                                                                                    dragStart <
                                                                                    dragEnd
                                                                                        ? dragEnd
                                                                                        : dragStart;
                                                                                const spanDays =
                                                                                    differenceInDays(
                                                                                        previewEndDay,
                                                                                        previewStartDay,
                                                                                    ) +
                                                                                    1;

                                                                                return (
                                                                                    <div
                                                                                        className="absolute top-1 bottom-1 left-0 rounded flex items-center px-2 text-xs font-normal select-none pointer-events-none z-20"
                                                                                        style={{
                                                                                            backgroundColor:
                                                                                                project.type ===
                                                                                                "leave"
                                                                                                    ? "#f97316"
                                                                                                    : project.color ||
                                                                                                      "#3b82f6",
                                                                                            width: `calc(${spanDays * 100}% + ${(spanDays - 1) * 1}px)`,
                                                                                        }}
                                                                                    >
                                                                                        <span className="text-white whitespace-nowrap truncate">
                                                                                            {project.type ===
                                                                                            "leave"
                                                                                                ? "Leave"
                                                                                                : project.name ||
                                                                                                  ""}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        {canModifyAllocations &&
                                                                            isHovered &&
                                                                            !hasAllocation &&
                                                                            !isDraggingNew &&
                                                                            !resizingAllocation && (
                                                                                <div className="absolute inset-0 flex items-center justify-center text-primary font-bold text-xs opacity-40 select-none pointer-events-none">
                                                                                    +
                                                                                </div>
                                                                            )}
                                                                    </td>
                                                                );
                                                            },
                                                        )}
                                                    </tr>
                                                ),
                                            )}

                                        {/* + Assign project row */}
                                        {viewMode === "people" && canModifyAllocations && isExpanded && (
                                            <tr className="group">
                                                <td
                                                    style={{
                                                        backgroundColor: "hsl(var(--card))",
                                                        borderRight: "2px solid hsl(var(--border))",
                                                        borderBottom: "2px solid hsl(var(--border))",
                                                        width: "274px",
                                                        minWidth: "274px",
                                                        maxWidth: "274px",
                                                    }}
                                                    className="pl-12 pr-4 py-2 sticky left-0 z-20"
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            const viewportHeight = window.innerHeight;
                                                            const spaceBelow = viewportHeight - rect.bottom;
                                                            const menuHeight = 350;

                                                            setShowProjectMenu({
                                                                rowId: row.id,
                                                                x: rect.left,
                                                                y: spaceBelow < menuHeight ? rect.top - menuHeight : rect.bottom,
                                                            });
                                                            setProjectSearchQuery("");
                                                        }}
                                                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        <span>Assign project</span>
                                                    </button>
                                                </td>
                                                {days.map((day, dayIdx) => (
                                                    <td
                                                        key={dayIdx}
                                                        style={{
                                                            borderLeft: dayIdx === 0 ? "none" : "1px solid hsl(var(--border) / 0.3)",
                                                            borderBottom: "2px solid hsl(var(--border))",
                                                        }}
                                                        className="h-[38px]"
                                                    />
                                                ))}
                                            </tr>
                                        )}

                                    </>
                                );
                            })}
                        {/* Filler row to extend borders to bottom */}
                        <tr style={{ height: "100%" }}>
                            <td
                                style={{
                                    backgroundColor: "hsl(var(--card))",
                                    borderRight: "2px solid hsl(var(--border))",
                                    width: "275px",
                                    minWidth: "275px",
                                    maxWidth: "275px",
                                }}
                                className="sticky left-0 z-20"
                            />
                            {days.map((day, dayIdx) => (
                                <td
                                    key={dayIdx}
                                    style={{
                                        borderLeft: dayIdx === 0 ? "none" : "1px solid hsl(var(--border) / 0.5)",
                                    }}
                                />
                            ))}
                        </tr>
                    </tbody>
                </table>

                {/* Project assignment dropdown menu */}
                {showProjectMenu && (
                    <>
                        {/* Backdrop to close menu */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowProjectMenu(null)}
                        />

                        {/* Menu */}
                        <div
                            className="fixed z-50 w-64 border-2 border-border rounded-lg shadow-2xl"
                            style={{
                                left: `${showProjectMenu.x}px`,
                                top: `${showProjectMenu.y}px`,
                                backgroundColor: "hsl(var(--card))",
                            }}
                        >
                            {/* Search bar */}
                            <div className="p-3 border-b border-border">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={projectSearchQuery}
                                        onChange={(e) =>
                                            setProjectSearchQuery(
                                                e.target.value,
                                            )
                                        }
                                        className="w-full pl-9 pr-3 py-2 text-sm text-foreground bg-background border-2 border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Project list */}
                            <div className="max-h-64 overflow-y-auto">
                                {(() => {
                                    // Get projects already assigned to this employee
                                    const assignedProjectIds = allocations
                                        .filter(a => a.employee_id === showProjectMenu.rowId && a.type === 'project')
                                        .map(a => a.project_id);

                                    // Filter to unassigned projects matching search
                                    const availableProjects = projects.filter((project) =>
                                        !assignedProjectIds.includes(project.id) &&
                                        project.name.toLowerCase().includes(projectSearchQuery.toLowerCase())
                                    );

                                    return availableProjects.length > 0 ? (
                                        availableProjects.map((project) => (
                                            <button
                                                key={project.id}
                                                onClick={() => {
                                                    setShowProjectMenu(null);
                                                    onAddAllocation(
                                                        format(
                                                            new Date(),
                                                            "yyyy-MM-dd",
                                                        ),
                                                        showProjectMenu.rowId,
                                                    );
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 cursor-pointer"
                                            >
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            project.color,
                                                    }}
                                                />
                                                <span className="text-foreground">
                                                    {project.name}
                                                </span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                            No projects to assign
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Add project button */}
                            <div className="p-2 border-t border-border">
                                <button
                                    onClick={() => {
                                        setShowProjectMenu(null);
                                        setShowAddProjectModal(true);
                                    }}
                                    className="w-full px-3 py-2 text-sm text-left text-foreground hover:bg-muted rounded-md transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add project
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Person assignment dropdown menu (for project view) */}
                {showPersonMenu && (
                    <>
                        {/* Backdrop to close menu */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowPersonMenu(null)}
                        />

                        {/* Menu */}
                        <div
                            className="fixed z-50 w-64 border-2 border-border rounded-lg shadow-2xl"
                            style={{
                                left: `${showPersonMenu.x}px`,
                                top: `${showPersonMenu.y}px`,
                                backgroundColor: "hsl(var(--card))",
                            }}
                        >
                            {/* Search bar */}
                            <div className="p-3 border-b border-border">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={personSearchQuery}
                                        onChange={(e) =>
                                            setPersonSearchQuery(e.target.value)
                                        }
                                        className="w-full pl-9 pr-3 py-2 text-sm text-foreground bg-background border-2 border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Person list */}
                            <div className="max-h-64 overflow-y-auto">
                                {(() => {
                                    // Get employees already assigned to this project
                                    const assignedEmployeeIds = allocations
                                        .filter(a => a.project_id === showPersonMenu.projectId && a.type === 'project')
                                        .map(a => a.employee_id);

                                    // Filter to unassigned employees matching search
                                    const availableEmployees = employees.filter((emp) =>
                                        !assignedEmployeeIds.includes(emp.id) &&
                                        emp.name.toLowerCase().includes(personSearchQuery.toLowerCase())
                                    );

                                    return availableEmployees.length > 0 ? (
                                        availableEmployees.map((emp) => (
                                            <button
                                                key={emp.id}
                                                onClick={() => {
                                                    setShowPersonMenu(null);
                                                    // Create allocation for this employee on this project
                                                    onAddAllocation(
                                                        format(new Date(), "yyyy-MM-dd"),
                                                        emp.id,
                                                        showPersonMenu.projectId
                                                    );
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 cursor-pointer"
                                            >
                                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                                                    {emp.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-foreground">
                                                    {emp.name}
                                                </span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                            No people to assign
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Add person button */}
                            <div className="p-2 border-t border-border">
                                <button
                                    onClick={() => {
                                        setShowPersonMenu(null);
                                        onAddPerson && onAddPerson();
                                    }}
                                    className="w-full px-3 py-2 text-sm text-left text-foreground hover:bg-muted rounded-md transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add person
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Add Project Modal */}
                {/* Allocation Context Menu */}
                {contextMenu && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setContextMenu(null)}
                        />

                        {/* Context Menu */}
                        <div
                            className="fixed bg-card border-2 border-border rounded-lg shadow-2xl p-2 z-50 min-w-[200px]"
                            style={{
                                left: `${contextMenu.x}px`,
                                top: `${contextMenu.y}px`,
                            }}
                        >
                            <div className="flex flex-col gap-1">
                                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
                                    {contextMenu.isLeave
                                        ? "Leave"
                                        : contextMenu.allocation.project
                                              ?.name || "Allocation"}
                                </div>

                                {canModifyAllocations && (
                                    <>
                                        <button
                                            onClick={() => {
                                                if (contextMenu.isLeave) {
                                                    // Edit leave (implement later if needed)
                                                    console.log(
                                                        "Edit leave:",
                                                        contextMenu.allocation,
                                                    );
                                                } else {
                                                    onEditAllocation(
                                                        contextMenu.allocation,
                                                    );
                                                }
                                                setContextMenu(null);
                                            }}
                                            className="px-3 py-2 text-sm text-left hover:bg-muted rounded transition-colors flex items-center gap-2"
                                        >
                                            <span>Edit allocation</span>
                                        </button>

                                        <button
                                            onClick={async () => {
                                                if (
                                                    confirm(
                                                        "Are you sure you want to delete this?",
                                                    )
                                                ) {
                                                    try {
                                                        if (contextMenu.isLeave) {
                                                            await fetch(
                                                                `/annual-leave/${contextMenu.allocation.id}`,
                                                                {
                                                                    method: "DELETE",
                                                                    credentials: "same-origin",
                                                                    headers: {
                                                                        "X-Requested-With":
                                                                            "XMLHttpRequest",
                                                                        Accept: "application/json",
                                                                        "X-CSRF-TOKEN":
                                                                            document.querySelector(
                                                                                'meta[name="csrf-token"]',
                                                                            )
                                                                                ?.content ||
                                                                            "",
                                                                    },
                                                                },
                                                            );
                                                            router.reload({
                                                                only: ["annualLeave"],
                                                                preserveScroll: true,
                                                            });
                                                        } else {
                                                            onDeleteAllocation(
                                                                contextMenu.allocation
                                                                    .id,
                                                            );
                                                        }
                                                    } catch (error) {
                                                        console.error(
                                                            "Error deleting:",
                                                            error,
                                                        );
                                                    }
                                                }
                                                setContextMenu(null);
                                            }}
                                            className="px-3 py-2 text-sm text-left hover:bg-destructive/10 text-destructive rounded transition-colors flex items-center gap-2"
                                        >
                                            <span>Delete</span>
                                        </button>

                                        <div className="border-t border-border my-1"></div>
                                    </>
                                )}

                                <button
                                    onClick={() => setContextMenu(null)}
                                    className="px-3 py-2 text-sm text-left hover:bg-muted rounded transition-colors text-muted-foreground"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Employee Menu */}
                {employeeMenu && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setEmployeeMenu(null)}
                        />

                        {/* Menu */}
                        <div
                            className="fixed rounded-lg shadow-2xl p-1 z-50 min-w-[160px]"
                            style={{
                                left: `${employeeMenu.x}px`,
                                top: `${employeeMenu.y}px`,
                                backgroundColor: "hsl(var(--card))",
                            }}
                        >
                            <button
                                onClick={() => {
                                    setEditingEmployeeName({
                                        id: employeeMenu.employee.id,
                                        name: employeeMenu.employee.name,
                                    });
                                    setEmployeeMenu(null);
                                }}
                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted rounded transition-colors flex items-center gap-2 cursor-pointer"
                            >
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                <span>Rename</span>
                            </button>

                            <button
                                onClick={async () => {
                                    if (confirm(`Are you sure you want to delete ${employeeMenu.employee.name}? This will also delete all their allocations and leave records.`)) {
                                        try {
                                            await fetch(`/api/employees/${employeeMenu.employee.id}`, {
                                                method: 'DELETE',
                                                headers: {
                                                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                                                },
                                            });
                                            router.reload({ preserveScroll: true });
                                        } catch (error) {
                                            console.error('Error deleting employee:', error);
                                        }
                                    }
                                    setEmployeeMenu(null);
                                }}
                                className="w-full px-3 py-2 text-sm text-left hover:bg-destructive/10 text-destructive rounded transition-colors flex items-center gap-2 cursor-pointer"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Add person button */}
            {viewMode === "people" && auth?.user?.role === "admin" && (
                <div className="px-4 py-3 border-t border-border bg-card">
                    <button
                        onClick={onAddPerson}
                        className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add person</span>
                    </button>
                </div>
            )}

            {/* Add project button */}
            {viewMode === "project" && canModifyAllocations && (
                <div className="px-4 py-3 border-t border-border bg-card">
                    <button
                        onClick={onAddProject}
                        className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Add project</span>
                    </button>
                </div>
            )}
        </div>
    );
});

CalendarGrid.displayName = 'CalendarGrid';

export default CalendarGrid;
