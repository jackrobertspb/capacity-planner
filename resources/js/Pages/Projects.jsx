import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import DarkModeToggle from '@/Components/DarkModeToggle';

export default function Projects({ projects }) {
    const { auth } = usePage().props;
    const [showForm, setShowForm] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#3b82f6',
        status: 'to_do',
        is_visible: true,
    });

    const statusOptions = [
        { value: 'to_do', label: 'To do', color: 'bg-blue-500' },
        { value: 'in_progress', label: 'In progress', color: 'bg-yellow-500' },
        { value: 'completed', label: 'Completed', color: 'bg-green-500' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
            const url = editingProject ? `/projects/${editingProject.id}` : '/projects';
            const method = editingProject ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                router.reload({ only: ['projects'] });
                handleCloseForm();
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'Failed to save project');
            }
        } catch (error) {
            console.error('Error saving project:', error);
            alert('Failed to save project');
        }
    };

    const handleDelete = async (projectId) => {
        if (!confirm('Are you sure you want to delete this project?')) {
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
                router.reload({ only: ['projects'] });
            } else {
                alert('Failed to delete project');
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Failed to delete project');
        }
    };

    const handleEdit = (project) => {
        setEditingProject(project);
        setFormData({
            name: project.name,
            description: project.description || '',
            color: project.color,
            status: project.status || 'to_do',
            is_visible: project.is_visible,
        });
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingProject(null);
        setFormData({
            name: '',
            description: '',
            color: '#3b82f6',
            status: 'to_do',
            is_visible: true,
        });
    };

    return (
        <>
            <Head title="Projects" />

            <div className="min-h-screen bg-background">
                <nav className="bg-card border-b border-border sticky top-0 z-50">
                    <div className="max-w-full px-4">
                        <div className="flex justify-between h-14">
                            <div className="flex items-center gap-4">
                                <Link
                                    href={route('dashboard')}
                                    className="text-base font-semibold text-foreground hover:text-primary transition-colors"
                                >
                                    Capacity Planner
                                </Link>
                                <span className="text-sm font-medium text-foreground px-2.5 py-1.5 rounded bg-muted/50">
                                    Projects
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

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage your projects and their settings
                            </p>
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 font-medium"
                        >
                            <Plus className="h-4 w-4" />
                            Add Project
                        </button>
                    </div>

                    {/* Projects Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map((project) => {
                            const status = statusOptions.find(s => s.value === project.status);
                            return (
                                <div
                                    key={project.id}
                                    className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2 flex-1">
                                            <div
                                                className="w-4 h-4 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: project.color }}
                                            />
                                            <h3 className="font-semibold text-foreground truncate">
                                                {project.name}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEdit(project)}
                                                className="p-1.5 hover:bg-muted rounded transition-colors"
                                                title="Edit project"
                                            >
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(project.id)}
                                                className="p-1.5 hover:bg-destructive/20 rounded transition-colors"
                                                title="Delete project"
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </button>
                                        </div>
                                    </div>

                                    {project.description && (
                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                            {project.description}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between text-xs">
                                        <span className={`px-2 py-1 rounded-full text-white font-medium ${status?.color || 'bg-gray-500'}`}>
                                            {status?.label || 'To Do'}
                                        </span>
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            {project.is_visible ? (
                                                <>
                                                    <Eye className="h-3.5 w-3.5" />
                                                    <span>Visible</span>
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff className="h-3.5 w-3.5" />
                                                    <span>Hidden</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {projects.length === 0 && (
                            <div className="col-span-full text-center py-12 text-muted-foreground">
                                <p className="text-lg mb-2">No projects yet</p>
                                <p className="text-sm">Click "Add Project" to create your first project</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={handleCloseForm}
                >
                    <div
                        className="bg-card rounded-lg p-6 max-w-md w-full shadow-xl border border-border"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-foreground mb-4">
                            {editingProject ? 'Edit Project' : 'Add Project'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Project Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Color
                                    </label>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full h-10 rounded-md cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Status
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none z-10"
                                             style={{
                                                 backgroundColor: statusOptions.find(s => s.value === formData.status)?.color.replace('bg-', '').replace('-500', '') === 'blue' ? '#3b82f6' :
                                                                  statusOptions.find(s => s.value === formData.status)?.color.replace('bg-', '').replace('-500', '') === 'yellow' ? '#eab308' :
                                                                  statusOptions.find(s => s.value === formData.status)?.color.replace('bg-', '').replace('-500', '') === 'green' ? '#22c55e' : '#3b82f6'
                                             }}
                                        />
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full pl-9 pr-10 py-2.5 bg-background border-2 border-border rounded-md text-foreground font-medium appearance-none cursor-pointer hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            style={{
                                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'right 0.75rem center'
                                            }}
                                        >
                                            {statusOptions.map(option => (
                                                <option 
                                                    key={option.value} 
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseForm}
                                    className="flex-1 px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                                >
                                    {editingProject ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
