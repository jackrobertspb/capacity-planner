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
import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import AllocationBlock from "../Allocation/AllocationBlock";
import { router, Link } from "@inertiajs/react";

export default function CalendarGrid({
    view,
    viewMode,
    sortMode,
    isCompressed,
    currentDate,
    dateRange,
    users,
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
    onAddProject,
    onAddPerson,
    auth,
    onViewModeChange,
    onSortModeChange,
    onToggleCompress,
}) {
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
            completed: { name: "Completed", projects: [], color: "#10b981" },
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
        viewMode === "people" ? users : getProjectRows(),
    );

    const [hoveredCell, setHoveredCell] = useState(null);
    const [resizingAllocation, setResizingAllocation] = useState(null);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [resizeStartDays, setResizeStartDays] = useState(0);
    const [resizePreviewDays, setResizePreviewDays] = useState(0);

    // Project assignment dropdown
    const [showProjectMenu, setShowProjectMenu] = useState(null); // { rowId, x, y }
    const [projectSearchQuery, setProjectSearchQuery] = useState("");

    // Add project modal

    // Drag-to-create state
    const [isDraggingNew, setIsDraggingNew] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragEnd, setDragEnd] = useState(null);
    const [dragRowId, setDragRowId] = useState(null);
    const [dragProjectId, setDragProjectId] = useState(null);
    const isProcessingDrag = useRef(false); // Prevent multiple simultaneous creations

    // Drag-to-move existing allocation state
    const [draggingAllocation, setDraggingAllocation] = useState(null);
    const [dragOffset, setDragOffset] = useState(0); // Days offset from original start
    const [dragPreviewStart, setDragPreviewStart] = useState(null);
    const dragStartPos = useRef(null); // Track initial mouse position
    const hasMoved = useRef(false); // Track if mouse has moved enough to be considered a drag
    const [pendingMove, setPendingMove] = useState(null); // Track allocation being moved until reload completes

    // Context menu for allocations
    const [contextMenu, setContextMenu] = useState(null); // { allocation, isLeave, x, y }

    // Initialize all rows as expanded by default
    const [expandedRows, setExpandedRows] = useState({});

    // Update expanded rows when rows change, expanding all by default
    useEffect(() => {
        const initialExpanded = {};
        rows.forEach((row) => {
            initialExpanded[row.id] = !isCompressed; // Expand if not compressed
        });
        setExpandedRows(initialExpanded);
    }, [users.length, projects.length, viewMode, isCompressed]);

    const getDaysInView = () => {
        if (view === "day") {
            return [currentDate];
        } else if (view === "week") {
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
            return eachDayOfInterval({ start: weekStart, end: weekEnd });
        } else {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            return eachDayOfInterval({ start: monthStart, end: monthEnd });
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
            if (!resizingAllocation) return;

            const deltaX = e.clientX - resizeStartX;
            const cellWidth = 80; // min-w-[80px]
            const deltaDays = Math.round(deltaX / cellWidth);

            let newDays = resizeStartDays;
            if (resizingAllocation.edge === "right") {
                newDays = Math.max(1, resizeStartDays + deltaDays);
            } else {
                newDays = Math.max(1, resizeStartDays - deltaDays);
            }

            // Update preview in real-time
            setResizePreviewDays(newDays);
        };

        const handleUp = async (e) => {
            if (!resizingAllocation) return;

            // Restore cursor and text selection
            document.body.style.userSelect = "";
            document.body.classList.remove("resizing-allocation");

            const deltaX = e.clientX - resizeStartX;
            const cellWidth = 80;
            const deltaDays = Math.round(deltaX / cellWidth);

            let newDays = resizeStartDays;
            if (resizingAllocation.edge === "right") {
                newDays = Math.max(1, resizeStartDays + deltaDays);
            } else {
                newDays = Math.max(1, resizeStartDays - deltaDays);
            }

            // Only update if days changed
            if (newDays !== resizeStartDays) {
                const allocation = resizingAllocation.allocation;
                const isLeave = resizingAllocation.isLeave;
                const startDate = startOfDay(
                    parseISO(
                        isLeave ? allocation.start_date : allocation.start_date,
                    ),
                );

                let newEndDate;
                if (resizingAllocation.edge === "right") {
                    // Extending/shrinking from right
                    newEndDate = new Date(startDate);
                    newEndDate.setDate(newEndDate.getDate() + newDays - 1);
                } else {
                    // Extending/shrinking from left
                    const endDate = startOfDay(
                        parseISO(
                            isLeave ? allocation.end_date : allocation.end_date,
                        ),
                    );
                    newEndDate = endDate;
                }

                try {
                    const csrfToken =
                        document.querySelector('meta[name="csrf-token"]')
                            ?.content || "";

                    if (isLeave) {
                        await fetch(`/annual-leave/${allocation.id}`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                "X-Requested-With": "XMLHttpRequest",
                                Accept: "application/json",
                                "X-CSRF-TOKEN": csrfToken,
                            },
                            body: JSON.stringify({
                                start_date: format(startDate, "yyyy-MM-dd"),
                                end_date: format(newEndDate, "yyyy-MM-dd"),
                                days_count: newDays,
                            }),
                        });
                    } else {
                        await fetch(`/allocations/${allocation.id}`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                "X-Requested-With": "XMLHttpRequest",
                                Accept: "application/json",
                                "X-CSRF-TOKEN": csrfToken,
                            },
                            body: JSON.stringify({
                                start_date: format(startDate, "yyyy-MM-dd"),
                                end_date: format(newEndDate, "yyyy-MM-dd"),
                            }),
                        });
                    }

                    router.reload({
                        only: ["allocations", "annualLeave"],
                        preserveScroll: true,
                    });
                } catch (error) {
                    console.error("Error resizing:", error);
                }
            }

            setResizingAllocation(null);
        };

        if (resizingAllocation) {
            window.addEventListener("mousemove", handleMove);
            window.addEventListener("mouseup", handleUp);
            return () => {
                window.removeEventListener("mousemove", handleMove);
                window.removeEventListener("mouseup", handleUp);
            };
        }
    }, [resizingAllocation, resizeStartX, resizeStartDays]);

    const toggleRow = (rowId) => {
        setExpandedRows((prev) => ({
            ...prev,
            [rowId]: !prev[rowId],
        }));
    };

    const getRowProjects = (row) => {
        if (viewMode === "people") {
            const userAllocations = allocations.filter(
                (a) => a.user_id === row.id,
            );
            const userLeave = annualLeave.filter((l) => l.user_id === row.id);

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
        // Prevent starting a new drag if one is already in progress or processing
        if (isDraggingNew || isProcessingDrag.current) return;

        setIsDraggingNew(true);
        setDragStart(day);
        setDragEnd(day);
        setDragRowId(rowId);
        setDragProjectId(projectId);
    };

    const handleDragNewMove = (day) => {
        // Only update drag end if we're actually dragging
        if (isDraggingNew && dragStart) {
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
                const response = await fetch("/annual-leave", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        Accept: "application/json",
                        "X-CSRF-TOKEN": csrfToken,
                    },
                    body: JSON.stringify({
                        user_id: dragRowId,
                        start_date: format(startDay, "yyyy-MM-dd"),
                        end_date: format(endDay, "yyyy-MM-dd"),
                        days_count: daysCount,
                        status: "approved",
                    }),
                });

                if (response.ok) {
                    router.reload({
                        only: ["allocations", "annualLeave"],
                        preserveScroll: true,
                        onSuccess: () => {
                            isProcessingDrag.current = false;
                        },
                    });
                } else {
                    const errorData = await response.json();
                    console.error("Failed to create leave:", errorData);
                    alert("Failed to create time off. Please try again.");
                    isProcessingDrag.current = false;
                }
            } else {
                // Handle project allocation
                const response = await fetch("/allocations", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        Accept: "application/json",
                        "X-CSRF-TOKEN": csrfToken,
                    },
                    body: JSON.stringify({
                        user_id: dragRowId,
                        project_id: dragProjectId,
                        type: "project",
                        start_date: format(startDay, "yyyy-MM-dd"),
                        end_date: format(endDay, "yyyy-MM-dd"),
                        days_per_week: 5.0,
                    }),
                });

                if (response.ok) {
                    router.reload({
                        only: ["allocations", "annualLeave"],
                        preserveScroll: true,
                        onSuccess: () => {
                            isProcessingDrag.current = false;
                        },
                    });
                } else {
                    const errorData = await response.json();
                    console.error("Failed to create allocation:", errorData);
                    alert("Failed to create allocation. Please try again.");
                    isProcessingDrag.current = false;
                }
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to create entry. Please try again.");
            isProcessingDrag.current = false;
        }
    };

    // Listen for mouseup to end drag
    useEffect(() => {
        if (isDraggingNew) {
            const handleMouseUp = () => {
                handleDragNewEnd();
            };
            window.addEventListener("mouseup", handleMouseUp, { once: true });
            return () => window.removeEventListener("mouseup", handleMouseUp);
        }
    }, [isDraggingNew, dragStart, dragEnd, dragRowId, dragProjectId]);

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

    const handleResizeStart = (e, allocation, isLeave, edge) => {
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
    };

    const handleDragAllocationStart = (e, allocation, isLeave) => {
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

        // Set initial preview to allocation's current position (no offset yet)
        const startDate = startOfDay(
            parseISO(isLeave ? allocation.start_date : allocation.start_date),
        );

        setDraggingAllocation({ allocation, isLeave });
        setDragOffset(0); // Start with no offset
        setDragPreviewStart(startDate); // Start preview at current position
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

            const clampedIndex = Math.max(0, Math.min(cellIndex, days.length - 1));
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

            document.body.style.userSelect = "";
            document.body.classList.remove("dragging-allocation");

            // If not moved enough, show context menu instead of trying to drag
            if (!hasMoved.current) {
                setContextMenu({
                    allocation: draggingAllocation.allocation,
                    isLeave: draggingAllocation.isLeave,
                    x: e?.clientX || dragStartPos.current?.x || 0,
                    y: e?.clientY || dragStartPos.current?.y || 0,
                });
                setDraggingAllocation(null);
                setDragOffset(0);
                setDragPreviewStart(null);
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

                // Set pending move to keep preview visible during API call
                setPendingMove({
                    allocation,
                    isLeave: draggingAllocation.isLeave,
                    newStart,
                    newEnd,
                });

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
                            console.log("Leave updated successfully");
                            console.log("Reloading page data...");

                            // Force a full page data reload without cache
                            router.visit(window.location.href, {
                                only: ["allocations", "annualLeave"],
                                preserveScroll: true,
                                preserveState: true,
                                replace: true,
                                onFinish: () => {
                                    console.log("Reload completed");
                                    setPendingMove(null);
                                },
                            });
                        } else {
                            const errorData = await response.json();
                            console.error("Failed to move leave:", errorData);
                            alert("Failed to move leave. Please try again.");
                            setPendingMove(null);
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
                            console.log(
                                "Allocation updated successfully:",
                                responseData,
                            );
                            console.log("Reloading page data...");

                            // Force a full page data reload without cache
                            router.visit(window.location.href, {
                                only: ["allocations", "annualLeave"],
                                preserveScroll: true,
                                preserveState: true,
                                replace: true,
                                onFinish: () => {
                                    console.log("Reload completed");
                                    setPendingMove(null);
                                },
                            });
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
                            setPendingMove(null);
                        }
                    }
                } catch (error) {
                    console.error("Error moving allocation. Exception:", error);
                    alert(
                        `Error moving allocation: ${error.message || "Please try again."}`,
                    );
                    setPendingMove(null);
                }
            }

            setDraggingAllocation(null);
            setDragOffset(0);
            setDragPreviewStart(null);
            dragStartPos.current = null;
            hasMoved.current = false;
        };

        if (draggingAllocation) {
            document.addEventListener("mousemove", handleDragMove);
            document.addEventListener("mouseup", handleDragEnd);

            return () => {
                document.removeEventListener("mousemove", handleDragMove);
                document.removeEventListener("mouseup", handleDragEnd);
            };
        }
    }, [draggingAllocation, dragOffset, dragPreviewStart, days]);

    const renderAllocationBlock = (
        allocation,
        firstDay,
        isLeave = false,
        allocIndex = 0,
    ) => {
        // Don't render the original if it's being moved (pending move)
        if (
            pendingMove &&
            pendingMove.allocation.id === allocation.id &&
            pendingMove.isLeave === isLeave
        ) {
            return null;
        }

        // Strict check for dragging state
        const isThisBeingDragged =
            draggingAllocation &&
            draggingAllocation.allocation.id === allocation.id &&
            draggingAllocation.isLeave === isLeave;

        const startDate = startOfDay(
            parseISO(isLeave ? allocation.start_date : allocation.start_date),
        );
        const endDate = startOfDay(
            parseISO(isLeave ? allocation.end_date : allocation.end_date),
        );
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
        const isBeingResized =
            resizingAllocation &&
            resizingAllocation.allocation.id === allocation.id;
        if (isBeingResized) {
            daysToSpan = resizePreviewDays;
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
                    className={`absolute top-1 left-1 right-1 h-[calc(100%-0.5rem)] rounded-md bg-orange-500 text-white text-xs px-1 py-1 font-medium shadow-sm flex items-center group/alloc cursor-move overflow-hidden ${isBeingResized ? "opacity-70" : ""}`}
                    style={{
                        width: `calc(${daysToSpan * 100}% - 0.5rem)`,
                        transition: isBeingResized
                            ? "none"
                            : "width 0.1s ease-out",
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
                    title={`Leave: ${format(startDate, "MMM d")} - ${format(addDays(startDate, daysToSpan - 1), "MMM d")} - Drag to move, drag edges to resize`}
                >
                    <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize"
                        style={{ zIndex: 20 }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleResizeStart(e, allocation, true, "left");
                        }}
                    />
                    <span className="flex-1 text-center flex items-center justify-center gap-1 overflow-hidden">
                        {daysToSpan > 1 && <Umbrella className="h-3 w-3 flex-shrink-0" />}
                        <span className="truncate">Leave</span>
                    </span>
                    <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                        style={{ zIndex: 20 }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleResizeStart(e, allocation, true, "right");
                        }}
                    />
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
                className={`absolute top-1 left-1 right-1 h-[calc(100%-0.5rem)] rounded-md text-white text-xs px-2 py-1 font-medium shadow-sm flex items-center cursor-move hover:shadow-md transition-shadow group/alloc ${isBeingResized ? "opacity-70" : ""}`}
                style={{
                    width: `calc(${daysToSpan * 100}% - 0.5rem)`,
                    backgroundColor: bgColor,
                    transition: isBeingResized ? "none" : "width 0.1s ease-out",
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
                    if (!isBeingResized) {
                        onEditAllocation(allocation);
                    }
                }}
                title={`${displayText}: ${format(startDate, "MMM d")} - ${format(addDays(startDate, daysToSpan - 1), "MMM d")} (${allocation.days_per_week} days/week) - Drag to move, drag edges to resize`}
            >
                <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize"
                    style={{ zIndex: 20 }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleResizeStart(e, allocation, false, "left");
                    }}
                />
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
                <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                    style={{ zIndex: 20 }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleResizeStart(e, allocation, false, "right");
                    }}
                />
            </div>
        );
    };

    return (
        <div className="relative h-full flex flex-col">
            <div className="relative flex-1 overflow-hidden">
                {/* Background columns extending to bottom */}
                <div className="absolute inset-0 flex pointer-events-none">
                    <div
                        className="sticky left-0 z-0"
                        style={{
                            backgroundColor: "hsl(var(--card))",
                            width: "334px",
                            maxWidth: "334px",
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
                <table
                    className="relative w-full z-10"
                    style={{
                        borderSpacing: 0,
                        borderCollapse: "separate",
                        minWidth: `${500 + (days.length * 60)}px`,
                        height: "100%",
                    }}
                >
                    {/* Month headers */}
                    <thead>
                        <tr>
                            <th
                                style={{
                                    backgroundColor: "hsl(var(--muted))",
                                    borderRight: "2px solid hsl(var(--border))",
                                    width: "274px",
                                    maxWidth: "274px",
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
                                    width: "274px",
                                    maxWidth: "274px",
                                }}
                                className="px-4 py-2 text-left sticky left-0 z-30"
                            ></th>
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
                                            maxWidth: "60px",
                                        }}
                                        className={`px-1 py-2 text-center font-semibold text-[0.65rem] min-w-[60px] ${
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
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={days.length + 1}
                                    style={{
                                        borderRight:
                                            "1px solid hsl(var(--border))",
                                        borderBottom:
                                            "1px solid hsl(var(--border))",
                                    }}
                                    className="p-8 text-center text-muted-foreground"
                                >
                                    No{" "}
                                    {viewMode === "people"
                                        ? "employees"
                                        : "projects"}{" "}
                                    available
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, rowIdx) => {
                                const isExpanded = expandedRows[row.id];
                                const rowProjects = getRowProjects(row);

                                return (
                                    <>
                                        {/* Main row */}
                                        <tr
                                            key={row.id}
                                            className="group"
                                            style={{
                                                borderBottom: "1px solid rgba(255, 255, 255, 0.15)"
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
                                                    borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
                                                    width: "280px",
                                                    maxWidth: "280px",
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
                                                    <span className="font-medium text-sm text-foreground">
                                                        {row.name}
                                                    </span>
                                                    <div className="w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                </div>
                                            </td>
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
                                                            borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
                                                        }}
                                                        className={`h-[44px] relative ${
                                                            isToday
                                                                ? "bg-primary/5"
                                                                : ""
                                                        }`}
                                                    ></td>
                                                );
                                            })}
                                        </tr>

                                        {/* Sub-rows (projects) */}
                                        {isExpanded &&
                                            rowProjects.map(
                                                (project, projIdx) => (
                                                    <tr
                                                        key={`${row.id}-${project.id}`}
                                                        className="group"
                                                        style={{
                                                            borderBottom: projIdx === rowProjects.length - 1 ? "1px solid rgba(255, 255, 255, 0.15)" : "none"
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
                                                                width: "280px",
                                                                maxWidth: "280px",
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

                                                                // Check if this cell is part of the drag preview
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
                                                                            outline: isHovered && !hasAllocation && !isDraggingNew && !resizingAllocation ? "2px dashed hsl(var(--primary) / 0.5)" : "none",
                                                                            outlineOffset: "-2px",
                                                                        }}
                                                                        className={`relative h-[38px] cursor-pointer select-none ${
                                                                            isToday
                                                                                ? "bg-primary/5"
                                                                                : ""
                                                                        } ${isDragPreview ? "bg-primary/10" : ""}`}
                                                                        onMouseEnter={() => {
                                                                            if (
                                                                                !resizingAllocation
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
                                                                                    );
                                                                                } else {
                                                                                    return renderAllocationBlock(
                                                                                        alloc,
                                                                                        day,
                                                                                        false,
                                                                                        allocIndex,
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
                                                                                          draggedAlloc.user_id ===
                                                                                              row.id
                                                                                        : project.id ===
                                                                                              draggedAlloc.project_id &&
                                                                                          draggedAlloc.user_id ===
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

                                                                                    return (
                                                                                        <div
                                                                                            className="absolute top-1 bottom-1 left-0 rounded flex items-center px-2 text-xs font-normal select-none pointer-events-none z-30 opacity-50 border-2 border-dashed border-white"
                                                                                            style={{
                                                                                                backgroundColor:
                                                                                                    bgColor,
                                                                                                width: `calc(${spanDays * 100}% + ${(spanDays - 1) * 1}px)`,
                                                                                            }}
                                                                                        >
                                                                                            <span className="text-white whitespace-nowrap truncate px-1">
                                                                                                {draggingAllocation.isLeave
                                                                                                    ? "Leave"
                                                                                                    : spanDays ===
                                                                                                        1
                                                                                                      ? "1d"
                                                                                                      : spanDays ===
                                                                                                          2
                                                                                                        ? "2d"
                                                                                                        : spanDays ===
                                                                                                            3
                                                                                                          ? `${(project.name || "").substring(0, 6)}${(project.name || "").length > 6 ? "..." : ""}`
                                                                                                          : `${project.name || ""} - ${draggedAlloc.days_per_week}d/w`}
                                                                                            </span>
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                        {/* Render pending move allocation in new position */}
                                                                        {pendingMove &&
                                                                            (() => {
                                                                                const pendingAlloc =
                                                                                    pendingMove.allocation;
                                                                                const duration =
                                                                                    differenceInDays(
                                                                                        pendingMove.newEnd,
                                                                                        pendingMove.newStart,
                                                                                    );

                                                                                // Check if this cell is the first day of the new position
                                                                                const isNewStart =
                                                                                    isSameDay(
                                                                                        day,
                                                                                        pendingMove.newStart,
                                                                                    );

                                                                                // Check if pending move applies to this row/project
                                                                                const appliesToThisRow =
                                                                                    pendingMove.isLeave
                                                                                        ? project.type ===
                                                                                              "leave" &&
                                                                                          pendingAlloc.user_id ===
                                                                                              row.id
                                                                                        : project.id ===
                                                                                              pendingAlloc.project_id &&
                                                                                          pendingAlloc.user_id ===
                                                                                              row.id;

                                                                                if (
                                                                                    isNewStart &&
                                                                                    appliesToThisRow
                                                                                ) {
                                                                                    const spanDays =
                                                                                        duration +
                                                                                        1;
                                                                                    const bgColor =
                                                                                        pendingMove.isLeave
                                                                                            ? "#f97316"
                                                                                            : project.color ||
                                                                                              "#3b82f6";

                                                                                    return (
                                                                                        <div
                                                                                            className="absolute top-1 bottom-1 left-0 rounded flex items-center px-2 text-xs font-normal select-none pointer-events-none z-30"
                                                                                            style={{
                                                                                                backgroundColor:
                                                                                                    bgColor,
                                                                                                width: `calc(${spanDays * 100}% + ${(spanDays - 1) * 1}px)`,
                                                                                            }}
                                                                                        >
                                                                                            <span className="text-white whitespace-nowrap truncate px-1">
                                                                                                {pendingMove.isLeave
                                                                                                    ? "Leave"
                                                                                                    : spanDays ===
                                                                                                        1
                                                                                                      ? "1d"
                                                                                                      : spanDays ===
                                                                                                          2
                                                                                                        ? "2d"
                                                                                                        : spanDays ===
                                                                                                            3
                                                                                                          ? `${(project.name || "").substring(0, 6)}${(project.name || "").length > 6 ? "..." : ""}`
                                                                                                          : `${project.name || ""} - ${pendingAlloc.days_per_week}d/w`}
                                                                                            </span>
                                                                                        </div>
                                                                                    );
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
                                                                        {isHovered &&
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

                                        {/* Assign project button row - ONLY in Projects view for status groups */}
                                        {isExpanded &&
                                            viewMode === "project" &&
                                            row.isStatusGroup && (
                                                <tr className="hover:bg-card/30 transition-colors">
                                                    <td
                                                        style={{
                                                            borderBottom:
                                                                "1px solid hsl(var(--border) / 0.5)",
                                                            backgroundColor:
                                                                "hsl(var(--card))",
                                                            borderRight:
                                                                "2px solid hsl(var(--border))",
                                                            width: "280px",
                                                            maxWidth: "280px",
                                                        }}
                                                        className="pl-12 pr-4 py-2 sticky left-0 z-20 relative"
                                                    >
                                                        <button
                                                            onClick={(e) => {
                                                                const rect =
                                                                    e.currentTarget.getBoundingClientRect();
                                                                setShowProjectMenu(
                                                                    {
                                                                        rowId: row.id,
                                                                        x: rect.left,
                                                                        y:
                                                                            rect.bottom +
                                                                            window.scrollY,
                                                                    },
                                                                );
                                                                setProjectSearchQuery(
                                                                    "",
                                                                );
                                                            }}
                                                            className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/70 rounded transition-colors flex items-center gap-1.5 font-medium text-muted-foreground cursor-pointer"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                            Assign project
                                                        </button>
                                                    </td>
                                                    {days.map((day, dayIdx) => {
                                                        const isToday =
                                                            isSameDay(
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
                                                                    borderRight:
                                                                        "1px solid hsl(var(--border))",
                                                                    borderBottom:
                                                                        "1px solid hsl(var(--border))",
                                                                }}
                                                                className={`min-h-[40px] ${
                                                                    isToday
                                                                        ? "bg-primary/5 relative"
                                                                        : isWeekend
                                                                          ? "bg-muted/20"
                                                                          : "bg-card"
                                                                }`}
                                                            >
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            )}
                                    </>
                                );
                            })
                        )}
                        {/* Filler row to extend borders to bottom */}
                        <tr style={{ height: "100%" }}>
                            <td
                                style={{
                                    backgroundColor: "hsl(var(--card))",
                                    borderRight: "2px solid hsl(var(--border))",
                                    width: "274px",
                                    maxWidth: "274px",
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
                                {projects.filter((project) =>
                                    project.name
                                        .toLowerCase()
                                        .includes(
                                            projectSearchQuery.toLowerCase(),
                                        ),
                                ).length > 0 ? (
                                    projects
                                        .filter((project) =>
                                            project.name
                                                .toLowerCase()
                                                .includes(
                                                    projectSearchQuery.toLowerCase(),
                                                ),
                                        )
                                        .map((project) => (
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
                                )}
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
        </div>
    );
}
