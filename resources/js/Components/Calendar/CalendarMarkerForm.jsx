import { useState } from 'react';
import { X } from 'lucide-react';

export default function CalendarMarkerForm({ marker, date, onClose, onSave }) {
    const [formData, setFormData] = useState({
        date: marker?.date || date || '',
        title: marker?.title || '',
        description: marker?.description || '',
        color: marker?.color || '#ef4444',
        type: marker?.type || 'custom',
    });
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        try {
            const url = marker 
                ? `/markers/${marker.id}`
                : '/markers';
            
            const method = marker ? 'PUT' : 'POST';
            
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (response.ok) {
                onSave();
                onClose();
            } else {
                if (result.errors) {
                    setErrors(result.errors);
                } else if (result.message) {
                    setErrors({ general: [result.message] });
                }
            }
        } catch (error) {
            console.error('Error saving marker:', error);
            setErrors({ general: ['An error occurred while saving the marker.'] });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md m-4">
                <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {marker ? 'Edit Marker' : 'New Marker'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-muted rounded-md"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-4 space-y-4">
                    {errors.general && (
                        <div className="p-3 bg-destructive/10 border border-destructive rounded-md text-sm text-destructive">
                            {errors.general[0]}
                        </div>
                    )}

                    <div>
                        <label htmlFor="date" className="block text-sm font-medium mb-2">
                            Date *
                        </label>
                        <input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                            required
                        />
                        {errors.date && (
                            <div className="text-destructive text-sm mt-1">{errors.date}</div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="title" className="block text-sm font-medium mb-2">
                            Title *
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                            required
                        />
                        {errors.title && (
                            <div className="text-destructive text-sm mt-1">{errors.title}</div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-2">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {errors.description && (
                            <div className="text-destructive text-sm mt-1">{errors.description}</div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="color" className="block text-sm font-medium mb-2">
                                Color
                            </label>
                            <input
                                id="color"
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="w-full h-10 border border-input rounded-md cursor-pointer"
                            />
                        </div>

                        <div>
                            <label htmlFor="type" className="block text-sm font-medium mb-2">
                                Type
                            </label>
                            <select
                                id="type"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="custom">Custom</option>
                                <option value="project_end">Project End</option>
                                <option value="milestone">Milestone</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium border border-input rounded-lg hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                        >
                            {processing ? 'Saving...' : 'Save Marker'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

