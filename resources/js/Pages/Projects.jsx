import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import DarkModeToggle from '@/Components/DarkModeToggle';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Textarea } from "@/Components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/Components/ui/select";
import { Label } from "@/Components/ui/label";
import { toast } from "sonner";

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
                toast.success('Project saved successfully!');
                router.reload({ only: ['projects'] });
                handleCloseForm();
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Failed to save project');
            }
        } catch (error) {
            console.error('Error saving project:', error);
            toast.error('Failed to save project');
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
                toast.success('Project deleted successfully!');
                router.reload({ only: ['projects'] });
            } else {
                toast.error('Failed to delete project');
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            toast.error('Failed to delete project');
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
                        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Project
                        </Button>
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
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(project)}
                                                title="Edit project"
                                                className="h-8 w-8"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(project.id)}
                                                title="Delete project"
                                                className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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
            <Dialog open={showForm} onOpenChange={(open) => !open && handleCloseForm()}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingProject ? 'Edit Project' : 'Add Project'}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name *</Label>
                            <Input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="color">Color</Label>
                                <Input
                                    id="color"
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="h-10 cursor-pointer"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={handleCloseForm} className="flex-1">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1">
                                {editingProject ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
