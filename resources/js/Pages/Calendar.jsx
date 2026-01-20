import { useState, useRef, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subWeeks, subMonths, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { Plus, User, FolderPlus, X } from 'lucide-react';
import DarkModeToggle from '@/Components/DarkModeToggle';
import CalendarHeader from '@/Components/Calendar/CalendarHeader';
import CalendarGrid from '@/Components/Calendar/CalendarGrid';
import AllocationForm from '@/Components/Allocation/AllocationForm';
import CalendarMarkerForm from '@/Components/Calendar/CalendarMarkerForm';

export default function Calendar({ startDate, endDate, users, projects, allocations, annualLeave, markers }) {
    const { auth } = usePage().props;
    const [view, setView] = useState('month'); // 'day', 'week', 'month'
    const [viewMode, setViewMode] = useState('people'); // 'people' or 'project'
    const [sortMode, setSortMode] = useState('manual'); // 'manual' or 'name'
    const [isCompressed, setIsCompressed] = useState(false);
    const [currentDate, setCurrentDate] = useState(parseISO(startDate));
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
    const [showAddPersonModal, setShowAddPersonModal] = useState(false);
    const [newPersonFirstName, setNewPersonFirstName] = useState('');
    const [newPersonLastName, setNewPersonLastName] = useState('');
    const [newPersonCapacity, setNewPersonCapacity] = useState(5);
    const [newPersonCanAccess, setNewPersonCanAccess] = useState(false);
    const addMenuRef = useRef(null);

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

    const updateCalendarRange = (date) => {
        let newStartDate, newEndDate;
        
        if (view === 'day') {
            newStartDate = format(date, 'yyyy-MM-dd');
            newEndDate = format(date, 'yyyy-MM-dd');
        } else if (view === 'week') {
            newStartDate = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            newEndDate = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        } else {
            newStartDate = format(startOfMonth(date), 'yyyy-MM-dd');
            newEndDate = format(endOfMonth(date), 'yyyy-MM-dd');
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
        updateCalendarRange(currentDate);
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

    const handleSaveAllocation = () => {
        router.reload({ only: ['allocations'] });
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
                                    test
                                </h1>
                                <Link
                                    href={route('projects')}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded hover:bg-muted/50"
                                >
                                    Projects
                                </Link>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-muted-foreground">{auth.user?.name}</span>
                                {auth.user?.role === 'admin' && (
                                    <Link
                                        href="/admin"
                                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded hover:bg-muted/50"
                                    >
                                        Admin Panel
                                    </Link>
                                )}
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
                                                        setShowAddPersonModal(true);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3 cursor-pointer"
                                                >
                                                    <User className="h-4 w-4" />
                                                    <span>Add person</span>
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
                    <div className="flex-shrink-0 py-4">
                        <CalendarHeader
                            currentDate={currentDate}
                            view={view}
                            onViewChange={handleViewChange}
                            onNavigate={navigateDate}
                            onToday={goToToday}
                        />
                    </div>

                    <div className="flex-1 overflow-hidden pb-4">
                        <CalendarGrid
                                view={view}
                                viewMode={viewMode}
                                sortMode={sortMode}
                                isCompressed={isCompressed}
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
                                onAddProject={() => setShowAddProjectModal(true)}
                                onAddPerson={() => setShowAddPersonModal(true)}
                                auth={auth}
                                onViewModeChange={setViewMode}
                                onSortModeChange={setSortMode}
                                onToggleCompress={() => setIsCompressed(!isCompressed)}
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
                                                status: newProjectStatus,
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
                                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                Add new project
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Add Person Modal */}
            {showAddPersonModal && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
                        onClick={() => setShowAddPersonModal(false)}
                    />

                    {/* Modal */}
                    <div
                        className="fixed z-50 w-full max-w-md rounded-lg shadow-2xl"
                        style={{
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: '#2d2d2d'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#3d3d3d' }}>
                            <h2 className="text-xl font-semibold text-white">Add new person</h2>
                            <button
                                onClick={() => setShowAddPersonModal(false)}
                                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {/* First name */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    First name<span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="E.g. John"
                                    value={newPersonFirstName}
                                    onChange={(e) => setNewPersonFirstName(e.target.value)}
                                    className="w-full px-3 py-2.5 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    style={{ backgroundColor: '#3d3d3d', border: 'none' }}
                                />
                            </div>

                            {/* Last name */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Last name<span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="E.g. Doe"
                                    value={newPersonLastName}
                                    onChange={(e) => setNewPersonLastName(e.target.value)}
                                    className="w-full px-3 py-2.5 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    style={{ backgroundColor: '#3d3d3d', border: 'none' }}
                                />
                            </div>

                            {/* Capacity */}
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Capacity<span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        placeholder="E.g 5"
                                        value={newPersonCapacity}
                                        onChange={(e) => setNewPersonCapacity(Number(e.target.value))}
                                        min="0"
                                        max="7"
                                        className="w-24 px-3 py-2.5 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        style={{ backgroundColor: '#3d3d3d', border: 'none' }}
                                    />
                                    <span className="text-sm text-gray-400">Days per week</span>
                                </div>
                            </div>

                            {/* Can access workspace - Toggle */}
                            <div className="flex items-center justify-between pt-2">
                                <label className="text-sm font-medium text-white cursor-pointer select-none">
                                    Can access workspace
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setNewPersonCanAccess(!newPersonCanAccess)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer transition-colors duration-200 ease-in-out ${
                                        newPersonCanAccess ? 'bg-primary' : 'bg-gray-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                                            newPersonCanAccess ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t" style={{ borderColor: '#3d3d3d' }}>
                            <button
                                onClick={() => setShowAddPersonModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-md transition-colors cursor-pointer"
                                style={{ backgroundColor: 'transparent' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!newPersonFirstName.trim() || !newPersonLastName.trim()) return;

                                    console.log('🚀 Starting person creation...');
                                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
                                    console.log('🔑 CSRF Token:', csrfToken ? 'Found' : 'Missing');

                                    const userData = {
                                        name: `${newPersonFirstName} ${newPersonLastName}`,
                                        email: `${newPersonFirstName.toLowerCase()}.${newPersonLastName.toLowerCase()}.${Date.now()}@example.com`,
                                        password: 'password',
                                        role: newPersonCanAccess ? 'user' : 'guest',
                                        work_days: [1, 2, 3, 4, 5].slice(0, newPersonCapacity),
                                        annual_leave_default: 25,
                                        is_visible: true,
                                    };
                                    console.log('📦 User data to send:', userData);

                                    try {
                                        console.log('📡 Sending POST request to /api/users...');
                                        const response = await fetch('/api/users', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'X-Requested-With': 'XMLHttpRequest',
                                                'Accept': 'application/json',
                                                'X-CSRF-TOKEN': csrfToken,
                                            },
                                            body: JSON.stringify(userData),
                                        });

                                        console.log('📨 Response status:', response.status);
                                        console.log('📨 Response OK:', response.ok);

                                        if (response.ok) {
                                            const responseData = await response.json();
                                            console.log('✅ User created successfully:', responseData);
                                            console.log('🔄 Reloading page...');
                                            router.reload({ preserveScroll: true });
                                            setShowAddPersonModal(false);
                                            setNewPersonFirstName('');
                                            setNewPersonLastName('');
                                            setNewPersonCapacity(5);
                                            setNewPersonCanAccess(false);
                                        } else {
                                            const errorData = await response.json();
                                            console.error('❌ Error creating person:', response.status, errorData);
                                            alert(`Failed to create person: ${errorData.message || 'Unknown error'}`);
                                        }
                                    } catch (error) {
                                        console.error('❌ Exception creating person:', error);
                                        alert(`Error creating person: ${error.message}`);
                                    }
                                }}
                                disabled={!newPersonFirstName.trim() || !newPersonLastName.trim()}
                                className="px-5 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Add person
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

