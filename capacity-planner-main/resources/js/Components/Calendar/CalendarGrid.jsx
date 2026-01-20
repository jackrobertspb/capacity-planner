import { format, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isWithinInterval, parseISO, getDay, isSameMonth, differenceInDays, startOfDay } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus, Search, X } from 'lucide-react';
import AllocationBlock from '../Allocation/AllocationBlock';
import { router } from '@inertiajs/react';

export default function CalendarGrid({ view, viewMode, currentDate, dateRange, users, projects, allocations, annualLeave, markers, onAddAllocation, onEditAllocation, onDeleteAllocation, onAddMarker, onEditMarker, onDeleteMarker }) {
    const rows = viewMode === 'people' ? users : projects;
    
    const [hoveredCell, setHoveredCell] = useState(null);
    const [resizingAllocation, setResizingAllocation] = useState(null);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [resizeStartDays, setResizeStartDays] = useState(0);
    const [resizePreviewDays, setResizePreviewDays] = useState(0);
    
    // Project assignment dropdown
    const [showProjectMenu, setShowProjectMenu] = useState(null); // { rowId, x, y }
    const [projectSearchQuery, setProjectSearchQuery] = useState('');
    
    // Add project modal
    const [showAddProjectModal, setShowAddProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectStatus, setNewProjectStatus] = useState('to_do');
    const [newProjectColor, setNewProjectColor] = useState('#64748b');
    
    // Drag-to-create state
    const [isDraggingNew, setIsDraggingNew] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragEnd, setDragEnd] = useState(null);
    const [dragRowId, setDragRowId] = useState(null);
    const [dragProjectId, setDragProjectId] = useState(null);
    
    // Initialize all rows as expanded by default
    const [expandedRows, setExpandedRows] = useState({});
    
    // Update expanded rows when rows change, expanding all by default
    useEffect(() => {
        const initialExpanded = {};
        rows.forEach(row => {
            initialExpanded[row.id] = true;
        });
        setExpandedRows(initialExpanded);
    }, [users.length, projects.length, viewMode]);

    const getDaysInView = () => {
        if (view === 'day') {
            return [currentDate];
        } else if (view === 'week') {
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
            return eachDayOfInterval({ start: weekStart, end: weekEnd });
        } else {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
            return eachDayOfInterval({ start: weekStart, end: weekEnd });
        }
    };

    const days = getDaysInView();
    const today = new Date();

    // Group days by month for month headers
    const monthGroups = {};
    days.forEach((day) => {
        const monthKey = format(day, 'MMMM yyyy');
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
            if (resizingAllocation.edge === 'right') {
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
            document.body.style.userSelect = '';
            document.body.classList.remove('resizing-allocation');
            
            const deltaX = e.clientX - resizeStartX;
            const cellWidth = 80;
            const deltaDays = Math.round(deltaX / cellWidth);
            
            let newDays = resizeStartDays;
            if (resizingAllocation.edge === 'right') {
                newDays = Math.max(1, resizeStartDays + deltaDays);
            } else {
                newDays = Math.max(1, resizeStartDays - deltaDays);
            }
            
            // Only update if days changed
            if (newDays !== resizeStartDays) {
                const allocation = resizingAllocation.allocation;
                const isLeave = resizingAllocation.isLeave;
                const startDate = startOfDay(parseISO(isLeave ? allocation.start_date : allocation.start_date));
                
                let newEndDate;
                if (resizingAllocation.edge === 'right') {
                    // Extending/shrinking from right
                    newEndDate = new Date(startDate);
                    newEndDate.setDate(newEndDate.getDate() + newDays - 1);
                } else {
                    // Extending/shrinking from left
                    const endDate = startOfDay(parseISO(isLeave ? allocation.end_date : allocation.end_date));
                    newEndDate = endDate;
                }
                
                try {
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
                    
                    if (isLeave) {
                        await fetch(`/annual-leave/${allocation.id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                                'Accept': 'application/json',
                                'X-CSRF-TOKEN': csrfToken,
                            },
                            body: JSON.stringify({
                                start_date: format(startDate, 'yyyy-MM-dd'),
                                end_date: format(newEndDate, 'yyyy-MM-dd'),
                                days_count: newDays,
                            }),
                        });
                    } else {
                        await fetch(`/allocations/${allocation.id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                                'Accept': 'application/json',
                                'X-CSRF-TOKEN': csrfToken,
                            },
                            body: JSON.stringify({
                                start_date: format(startDate, 'yyyy-MM-dd'),
                                end_date: format(newEndDate, 'yyyy-MM-dd'),
                            }),
                        });
                    }
                    
                    router.reload({ only: ['allocations', 'annualLeave'], preserveScroll: true });
                } catch (error) {
                    console.error('Error resizing:', error);
                }
            }
            
            setResizingAllocation(null);
        };

        if (resizingAllocation) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
            return () => {
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', handleUp);
            };
        }
    }, [resizingAllocation, resizeStartX, resizeStartDays]);

    const toggleRow = (rowId) => {
        setExpandedRows(prev => ({
            ...prev,
            [rowId]: !prev[rowId]
        }));
    };

    const getRowProjects = (row) => {
        if (viewMode === 'people') {
            const userAllocations = allocations.filter(a => a.user_id === row.id);
            const userLeave = annualLeave.filter(l => l.user_id === row.id);
            
            const projectMap = new Map();
            
            // Always add time off (required field)
            projectMap.set('time-off', {
                id: 'time-off',
                name: 'Time off',
                count: userLeave.length,
                type: 'leave',
                allocations: userLeave
            });

            // Add projects
            userAllocations.forEach(alloc => {
                if (alloc.type === 'project' && alloc.project) {
                    if (!projectMap.has(alloc.project_id)) {
                        projectMap.set(alloc.project_id, {
                            id: alloc.project_id,
                            name: alloc.project.name,
                            color: alloc.project.color,
                            count: 0,
                            type: 'project',
                            allocations: []
                        });
                    }
                    const proj = projectMap.get(alloc.project_id);
                    proj.count++;
                    proj.allocations.push(alloc);
                } else if (alloc.type !== 'project') {
                    const key = `${alloc.type}-${alloc.title}`;
                    if (!projectMap.has(key)) {
                        projectMap.set(key, {
                            id: key,
                            name: alloc.title || alloc.type,
                            count: 0,
                            type: alloc.type,
                            allocations: []
                        });
                    }
                    const proj = projectMap.get(key);
                    proj.count++;
                    proj.allocations.push(alloc);
                }
            });

            return Array.from(projectMap.values());
        }
        return [];
    };

    const handleDragNewStart = (day, rowId, projectId) => {
        setIsDraggingNew(true);
        setDragStart(day);
        setDragEnd(day);
        setDragRowId(rowId);
        setDragProjectId(projectId);
    };

    const handleDragNewMove = (day) => {
        if (isDraggingNew && dragStart) {
            setDragEnd(day);
        }
    };

    const handleDragNewEnd = async () => {
        if (isDraggingNew && dragStart && dragEnd && dragRowId && dragProjectId) {
            const startDay = dragStart < dragEnd ? dragStart : dragEnd;
            const endDay = dragStart < dragEnd ? dragEnd : dragStart;
            const daysCount = differenceInDays(endDay, startDay) + 1;
            
            // Keep the preview visible while saving
            const savedDragStart = dragStart;
            const savedDragEnd = dragEnd;
            const savedDragRowId = dragRowId;
            const savedDragProjectId = dragProjectId;
            
            setIsDraggingNew(false); // Stop dragging but keep the data for preview
            
            try {
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
                
                // Handle time-off (annual leave) separately
                if (savedDragProjectId === 'time-off') {
                    const response = await fetch('/annual-leave', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                        },
                        body: JSON.stringify({
                            user_id: savedDragRowId,
                            start_date: format(startDay, 'yyyy-MM-dd'),
                            end_date: format(endDay, 'yyyy-MM-dd'),
                            days_count: daysCount,
                            status: 'approved'
                        }),
                    });

                    if (response.ok) {
                        router.reload({ 
                            only: ['allocations', 'annualLeave'], 
                            preserveScroll: true,
                            onSuccess: () => {
                                // Clear after new data arrives
                                setDragStart(null);
                                setDragEnd(null);
                                setDragRowId(null);
                                setDragProjectId(null);
                            }
                        });
                    } else {
                        const errorData = await response.json();
                        console.error('Failed to create leave:', errorData);
                        alert('Failed to create time off. Please try again.');
                        // Clear on error
                        setDragStart(null);
                        setDragEnd(null);
                        setDragRowId(null);
                        setDragProjectId(null);
                    }
                } else {
                    // Handle project allocation
                    const response = await fetch('/allocations', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                        },
                        body: JSON.stringify({
                            user_id: savedDragRowId,
                            project_id: savedDragProjectId,
                            type: 'project',
                            start_date: format(startDay, 'yyyy-MM-dd'),
                            end_date: format(endDay, 'yyyy-MM-dd'),
                            days_per_week: 5.0,
                        }),
                    });

                    if (response.ok) {
                        router.reload({ 
                            only: ['allocations', 'annualLeave'], 
                            preserveScroll: true,
                            onSuccess: () => {
                                // Clear after new data arrives
                                setDragStart(null);
                                setDragEnd(null);
                                setDragRowId(null);
                                setDragProjectId(null);
                            }
                        });
                    } else {
                        const errorData = await response.json();
                        console.error('Failed to create allocation:', errorData);
                        alert('Failed to create allocation. Please try again.');
                        // Clear on error
                        setDragStart(null);
                        setDragEnd(null);
                        setDragRowId(null);
                        setDragProjectId(null);
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                // Clear on error
                setDragStart(null);
                setDragEnd(null);
                setDragRowId(null);
                setDragProjectId(null);
            }
        } else {
            // If we're not in a valid drag state, just clear everything
            setIsDraggingNew(false);
            setDragStart(null);
            setDragEnd(null);
            setDragRowId(null);
            setDragProjectId(null);
        }
    };

    useEffect(() => {
        if (isDraggingNew) {
            const handleMouseUp = () => handleDragNewEnd();
            window.addEventListener('mouseup', handleMouseUp);
            return () => window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isDraggingNew, dragStart, dragEnd, dragRowId]);

    // Close project menu on Escape key
    useEffect(() => {
        if (showProjectMenu) {
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    setShowProjectMenu(null);
                }
            };
            window.addEventListener('keydown', handleEscape);
            return () => window.removeEventListener('keydown', handleEscape);
        }
    }, [showProjectMenu]);

    const handleResizeStart = (e, allocation, isLeave, edge) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent text selection and force cursor during drag
        document.body.style.userSelect = 'none';
        document.body.classList.add('resizing-allocation');
        
        // Clear any hover state
        setHoveredCell(null);
        
        const startDate = startOfDay(parseISO(isLeave ? allocation.start_date : allocation.start_date));
        const endDate = startOfDay(parseISO(isLeave ? allocation.end_date : allocation.end_date));
        const days = differenceInDays(endDate, startDate) + 1;
        
        setResizingAllocation({ allocation, isLeave, edge });
        setResizeStartX(e.clientX);
        setResizeStartDays(days);
        setResizePreviewDays(days);
    };

    const renderAllocationBlock = (allocation, firstDay, isLeave = false) => {
        const startDate = startOfDay(parseISO(isLeave ? allocation.start_date : allocation.start_date));
        const endDate = startOfDay(parseISO(isLeave ? allocation.end_date : allocation.end_date));
        const firstDayDate = startOfDay(firstDay);
        
        // Check if this allocation starts on this day
        const startsHere = isSameDay(startDate, firstDayDate);
        if (!startsHere) return null;

        // Calculate how many days to span
        const lastDayDate = startOfDay(days[days.length - 1]);
        const effectiveEndDate = endDate > lastDayDate ? lastDayDate : endDate;
        let daysToSpan = Math.min(differenceInDays(effectiveEndDate, startDate) + 1, days.length);
        const dayIndex = days.findIndex(d => isSameDay(d, firstDayDate));
        
        // Use preview days if this allocation is being resized
        const isBeingResized = resizingAllocation && resizingAllocation.allocation.id === allocation.id;
        if (isBeingResized) {
            daysToSpan = resizePreviewDays;
        }
        
        if (isLeave) {
            return (
                <div
                    key={allocation.id}
                    className={`absolute top-1 left-1 right-1 h-[calc(100%-0.5rem)] rounded-md bg-orange-500 text-white text-xs px-2 py-1 font-medium shadow-sm flex items-center z-10 group/alloc ${isBeingResized ? 'opacity-70' : ''}`}
                    style={{
                        width: `calc(${daysToSpan * 100}% - 0.5rem)`,
                        transition: isBeingResized ? 'none' : 'width 0.1s ease-out'
                    }}
                    title={`Leave: ${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`}
                >
                    <div
                        className="absolute left-0 top-0 bottom-0 w-6 cursor-ew-resize opacity-0 group-hover/alloc:opacity-100 hover:bg-white/30 transition-opacity"
                        onMouseDown={(e) => handleResizeStart(e, allocation, true, 'left')}
                    />
                    <span className="flex-1 text-center">🏖️ Leave</span>
                    <div
                        className="absolute right-0 top-0 bottom-0 w-6 cursor-ew-resize opacity-0 group-hover/alloc:opacity-100 hover:bg-white/30 transition-opacity"
                        onMouseDown={(e) => handleResizeStart(e, allocation, true, 'right')}
                    />
                </div>
            );
        }

        const displayText = allocation.project?.name || allocation.title || allocation.type;
        const bgColor = allocation.project?.color || '#8b5cf6';
        
        return (
            <div
                key={allocation.id}
                className={`absolute top-1 left-1 right-1 h-[calc(100%-0.5rem)] rounded-md text-white text-xs px-2 py-1 font-medium shadow-sm flex items-centers cursor-pointer hover:shadow-md transition-shadow z-10 group/alloc ${isBeingResized ? 'opacity-70' : ''}`}
                style={{
                    width: `calc(${daysToSpan * 100}% - 0.5rem)`,
                    backgroundColor: bgColor,
                    transition: isBeingResized ? 'none' : 'width 0.1s ease-out'
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isBeingResized) {
                        onEditAllocation(allocation);
                    }
                }}
                title={`${displayText}: ${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')} (${allocation.days_per_week} days/week)`}
            >
                <div
                    className="absolute left-0 top-0 bottom-0 w-6 cursor-ew-resize opacity-0 group-hover/alloc:opacity-100 hover:bg-white/30 transition-opacity"
                    onMouseDown={(e) => handleResizeStart(e, allocation, false, 'left')}
                />
                <span className="flex-1">{displayText} - {allocation.days_per_week}d/w</span>
                <div
                    className="absolute right-0 top-0 bottom-0 w-6 cursor-ew-resize opacity-0 group-hover/alloc:opacity-100 hover:bg-white/30 transition-opacity"
                    onMouseDown={(e) => handleResizeStart(e, allocation, false, 'right')}
                />
            </div>
        );
    };

    return (
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full" style={{ borderSpacing: 0, border: '1px solid hsl(var(--border))' }}>
                {/* Month headers */}
                <thead>
                    <tr>
                        <th style={{ borderRight: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }} className="bg-muted sticky left-0 z-20 min-w-[250px]"></th>
                        {Object.entries(monthGroups).map(([monthKey, monthDays], idx) => (
                            <th
                                key={monthKey}
                                colSpan={monthDays.length}
                                style={{ borderRight: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }}
                                className="bg-muted text-left px-4 py-2 font-bold text-sm text-foreground"
                            >
                                {monthKey}
                            </th>
                        ))}
                    </tr>
                    {/* Date headers */}
                    <tr>
                        <th style={{ borderRight: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }} className="p-3 bg-muted text-left font-semibold text-sm sticky left-0 z-20 min-w-[250px]">
                            {viewMode === 'people' ? 'People' : 'Projects'}
                        </th>
                        {days.map((day, idx) => {
                            const isToday = isSameDay(day, today);
                            const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                            
                            return (
                                <th
                                    key={idx}
                                    style={{ borderRight: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }}
                                    className={`px-3 py-2 text-center font-semibold text-xs min-w-[80px] ${
                                        isToday ? 'bg-primary/20 text-primary relative' : isWeekend ? 'bg-muted/70' : 'bg-muted'
                                    }`}
                                >
                                    <div className="uppercase tracking-wide">
                                        {format(day, 'd MMM')}
                                    </div>
                                    {isToday && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={days.length + 1} style={{ borderRight: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }} className="p-8 text-center text-muted-foreground">
                                No {viewMode === 'people' ? 'employees' : 'projects'} available
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, rowIdx) => {
                            const isExpanded = expandedRows[row.id];
                            const rowProjects = getRowProjects(row);
                            
                            return (
                                <>
                                    {/* Main row */}
                                    <tr key={row.id} className="group hover:bg-muted/20">
                                        <td style={{ borderRight: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }} className="p-3 bg-card sticky left-0 z-10">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleRow(row.id)}
                                                    className="p-1 hover:bg-muted rounded transition-colors"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </button>
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                                    {row.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-foreground">{row.name}</span>
                                            </div>
                                        </td>
                                        {days.map((day, dayIdx) => {
                                            const isToday = isSameDay(day, today);
                                            const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                                            
                                            return (
                                                <td
                                                    key={dayIdx}
                                                    style={{ borderRight: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }}
                                                    className={`min-h-[60px] ${
                                                        isToday ? 'bg-primary/5 relative' : isWeekend ? 'bg-muted/20' : 'bg-card'
                                                    }`}
                                                >
                                                    {isToday && (
                                                        <div className="absolute inset-y-0 left-0 w-0.5 bg-primary z-30"></div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>

                                    {/* Sub-rows (projects) */}
                                    {isExpanded && rowProjects.map((project) => (
                                        <tr key={`${row.id}-${project.id}`} className="group hover:bg-muted/10">
                                            <td style={{ borderRight: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }} className="pl-12 pr-3 py-2 bg-card/50 sticky left-0 z-10">
                                                <div className="flex items-center gap-2">
                                                    {project.type === 'leave' ? (
                                                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                                    ) : project.color ? (
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }}></div>
                                                    ) : (
                                                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                                                    )}
                                                    <span className="text-sm text-foreground">{project.name}</span>
                                                    <span className="text-xs text-muted-foreground ml-auto">{project.count}</span>
                                                </div>
                                </td>
                                {days.map((day, dayIdx) => {
                                                const isToday = isSameDay(day, today);
                                                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                                                const cellKey = `${row.id}-${project.id}-${dayIdx}`;
                                                const isHovered = hoveredCell === cellKey;
                                                
                                                // Check if this cell already has an allocation
                                                const hasAllocation = project.allocations.some(alloc => {
                                                    const allocStart = startOfDay(parseISO(project.type === 'leave' ? alloc.start_date : alloc.start_date));
                                                    const allocEnd = startOfDay(parseISO(project.type === 'leave' ? alloc.end_date : alloc.end_date));
                                                    return isWithinInterval(startOfDay(day), { start: allocStart, end: allocEnd });
                                                });
                                                
                                                // Check if this cell is part of the drag preview (only show if creating new, not if real data exists)
                                                const isDragPreview = dragRowId === row.id && 
                                                    dragProjectId === project.id &&
                                                    dragStart && dragEnd &&
                                                    !hasAllocation && // Only show preview if no real allocation exists
                                                    isWithinInterval(startOfDay(day), {
                                                        start: startOfDay(dragStart < dragEnd ? dragStart : dragEnd),
                                                        end: startOfDay(dragStart < dragEnd ? dragEnd : dragStart)
                                                    });
                                                
                                    return (
                                                    <td
                                            key={dayIdx}
                                                        style={{ borderRight: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }}
                                                        className={`relative min-h-[40px] cursor-pointer transition-colors ${
                                                            isToday ? 'bg-primary/5' : isWeekend ? 'bg-muted/20' : 'bg-muted/50'
                                                        } ${isHovered && !hasAllocation && !isDraggingNew && !resizingAllocation ? 'bg-primary/10 ring-2 ring-primary/30 ring-inset' : ''} ${isDragPreview ? 'bg-primary/30' : ''}`}
                                                        onMouseEnter={() => {
                                                            if (!resizingAllocation) {
                                                                setHoveredCell(cellKey);
                                                                handleDragNewMove(day);
                                                            }
                                                        }}
                                                        onMouseLeave={() => setHoveredCell(null)}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (!hasAllocation && !resizingAllocation) {
                                                                handleDragNewStart(day, row.id, project.id);
                                                            }
                                                        }}
                                                    >
                                                        {isToday && (
                                                            <div className="absolute inset-y-0 left-0 w-0.5 bg-primary z-30"></div>
                                                        )}
                                                        {project.allocations.map(alloc => {
                                                            if (project.type === 'leave') {
                                                                return renderAllocationBlock(alloc, day, true);
                                                            } else {
                                                                return renderAllocationBlock(alloc, day, false);
                                                            }
                                                        })}
                                                        {isDragPreview && (
                                                            <div className="absolute inset-1 rounded flex items-center justify-center text-xs font-medium" style={{
                                                                backgroundColor: project.type === 'leave' ? '#f97316' : (project.color || '#8b5cf6')
                                                            }}>
                                                                <span className="text-white font-medium">
                                                                    {project.type === 'leave' ? '🏖️ Leave' : (project.name || '')}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {isHovered && !hasAllocation && !isDraggingNew && !resizingAllocation && (
                                                            <div className="absolute inset-1 rounded flex items-center justify-center text-primary font-bold text-xs opacity-50">
                                                                +
                                                            </div>
                                                        )}
                                                    </td>
                                    );
                                })}
                            </tr>
                                    ))}
                                    
                                    {/* Assign project button row */}
                                    {isExpanded && (
                                        <tr className="hover:bg-muted/10">
                                            <td style={{ borderRight: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }} className="pl-12 pr-3 py-2 bg-card/50 sticky left-0 z-10 relative" colSpan={days.length + 1}>
                                                <button
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setShowProjectMenu({ 
                                                            rowId: row.id, 
                                                            x: rect.left, 
                                                            y: rect.bottom + window.scrollY 
                                                        });
                                                        setProjectSearchQuery('');
                                                    }}
                                                    className="text-xs px-3 py-1.5 bg-primary hover:bg-primary/90 rounded-md transition-colors flex items-center gap-1.5 font-semibold shadow-sm"
                                                    style={{ color: '#ffffff' }}
                                                >
                                                    <Plus className="h-3.5 w-3.5" style={{ color: '#ffffff' }} />
                                                    Assign project
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            );
                        })
                    )}
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
                            backgroundColor: 'hsl(var(--card))'
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
                                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    style={{ backgroundColor: 'hsl(var(--background))' }}
                                    autoFocus
                                />
                            </div>
                        </div>
                        
                        {/* Project list */}
                        <div className="max-h-64 overflow-y-auto">
                            {projects
                                .filter(project => 
                                    project.name.toLowerCase().includes(projectSearchQuery.toLowerCase())
                                )
                                .length > 0 ? (
                                projects
                                    .filter(project => 
                                        project.name.toLowerCase().includes(projectSearchQuery.toLowerCase())
                                    )
                                    .map(project => (
                                        <button
                                            key={project.id}
                                            onClick={async () => {
                                                const today = format(new Date(), 'yyyy-MM-dd');
                                                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
                                                
                                                try {
                                                    const response = await fetch('/allocations', {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'X-Requested-With': 'XMLHttpRequest',
                                                            'Accept': 'application/json',
                                                            'X-CSRF-TOKEN': csrfToken,
                                                        },
                                                        body: JSON.stringify({
                                                            user_id: showProjectMenu.rowId,
                                                            project_id: project.id,
                                                            type: 'project',
                                                            start_date: today,
                                                            end_date: today,
                                                            days_per_week: 5.0,
                                                        }),
                                                    });

                                                    if (response.ok) {
                                                        router.reload({ only: ['allocations'], preserveScroll: true });
                                                        setShowProjectMenu(null);
                                                    }
                                                } catch (error) {
                                                    console.error('Error assigning project:', error);
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                                        >
                                            <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: project.color }}
                                            />
                                            <span className="text-foreground">{project.name}</span>
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
                                className="w-full px-3 py-2 text-sm text-left text-foreground hover:bg-muted rounded-md transition-colors flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add project
                            </button>
                        </div>
                    </div>
                </>
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
                        className="fixed z-50 w-full max-w-md rounded-lg shadow-2xl"
                        style={{ 
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: 'hsl(var(--card))'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="text-xl font-semibold text-foreground">Add new project</h2>
                            <button
                                onClick={() => setShowAddProjectModal(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
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
                                    className="w-full px-3 py-2 text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    style={{ backgroundColor: 'hsl(var(--background))' }}
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
                                    className="w-full px-3 py-2 text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    style={{ backgroundColor: 'hsl(var(--background))' }}
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
                                            className="w-10 h-10 rounded-md relative flex items-center justify-center"
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
                                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!newProjectName.trim()) return;
                                    
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
                                                is_visible: true,
                                            }),
                                        });
                                        
                                        if (response.ok) {
                                            router.reload({ only: ['projects'], preserveScroll: true });
                                            setShowAddProjectModal(false);
                                            setNewProjectName('');
                                            setNewProjectStatus('to_do');
                                            setNewProjectColor('#64748b');
                                        }
                                    } catch (error) {
                                        console.error('Error creating project:', error);
                                    }
                                }}
                                disabled={!newProjectName.trim()}
                                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add new project
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
