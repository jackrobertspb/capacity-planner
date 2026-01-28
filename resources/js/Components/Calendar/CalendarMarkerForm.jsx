import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Textarea } from "@/Components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/Components/ui/select";
import { Label } from "@/Components/ui/label";
import { Alert, AlertDescription } from "@/Components/ui/alert";

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
                // Only trigger onSave - let parent handle closing after reload completes
                // Keep form open with "Saving..." state during reload
                onSave();
                // Don't set processing to false - keep "Saving..." until reload completes
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
            setProcessing(false);
        }
        // Note: Don't set processing=false in finally block for successful saves
        // Keep "Saving..." state until reload completes
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{marker ? 'Edit Marker' : 'New Marker'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    {errors.general && (
                        <Alert variant="destructive">
                            <AlertDescription>{errors.general[0]}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            required
                        />
                        {errors.date && (
                            <p className="text-destructive text-sm">{errors.date}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                        {errors.title && (
                            <p className="text-destructive text-sm">{errors.title}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                        />
                        {errors.description && (
                            <p className="text-destructive text-sm">{errors.description}</p>
                        )}
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
                            <Label htmlFor="type">Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => setFormData({ ...formData, type: value })}
                            >
                                <SelectTrigger id="type">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custom">Custom</SelectItem>
                                    <SelectItem value="project_end">Project End</SelectItem>
                                    <SelectItem value="milestone">Milestone</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving...' : 'Save Marker'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

