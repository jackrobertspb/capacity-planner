import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Textarea } from "@/Components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/Components/ui/select";
import { Label } from "@/Components/ui/label";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { Trash2 } from 'lucide-react';

export default function AllocationForm({ allocation, employees = [], projects = [], onClose, onSave, onDelete }) {
    console.log('AllocationForm start', { allocation, employees, projects });

    const [formData, setFormData] = useState({
        employee_id: allocation?.employee_id || '',
        project_id: allocation?.project_id || '',
        type: allocation?.type || 'project',
        title: allocation?.title || '',
        start_date: allocation?.start_date || '',
        end_date: allocation?.end_date || '',
        days_per_week: allocation?.days_per_week || 5.0,
        notes: allocation?.notes || '',
    });
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [warnings, setWarnings] = useState([]);

    console.log('AllocationForm after state init', { formData });

    const submit = async (e) => {
        e.preventDefault();
        console.log('🔵 [AllocationForm] Submit started');
        setProcessing(true);
        setErrors({});
        setWarnings([]);

        try {
            const url = allocation
                ? `/allocations/${allocation.id}`
                : '/allocations';

            const method = allocation ? 'PUT' : 'POST';

            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
            console.log('🔵 [AllocationForm] Sending request to:', url, 'Method:', method);

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

            console.log('🔵 [AllocationForm] Response received:', response.status);
            const result = await response.json();
            console.log('🔵 [AllocationForm] Response data:', result);

            if (response.ok) {
                if (result.warnings && result.warnings.length > 0) {
                    console.log('⚠️ [AllocationForm] Warnings found, keeping form open');
                    setWarnings(result.warnings);
                    setProcessing(false);
                } else {
                    console.log('✅ [AllocationForm] Success! Calling onSave()');
                    // Pass the saved allocation data and whether it was an edit
                    // Check if it's a real edit (has allocation without _isTemporary flag)
                    const isEdit = !!allocation && !allocation._isTemporary;
                    console.log('🔍 [AllocationForm] isEdit check:', { hasAllocation: !!allocation, isTemporary: allocation?._isTemporary, isEdit });
                    onSave(result, isEdit);
                    // Form will close immediately now - no need to keep processing state
                }
            } else {
                console.log('❌ [AllocationForm] Request failed');
                if (result.errors) {
                    setErrors(result.errors);
                } else if (result.message) {
                    setErrors({ general: [result.message] });
                }
                setProcessing(false);
            }
        } catch (error) {
            console.error('❌ [AllocationForm] Error saving allocation:', error);
            setErrors({ general: ['An error occurred while saving the allocation.'] });
            setProcessing(false);
        }
        // Note: Don't set processing=false in finally block - we want to keep
        // "Saving..." state until reload completes for successful saves
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{allocation ? 'Edit Allocation' : 'New Allocation'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    {errors.general && (
                        <Alert variant="destructive">
                            <AlertDescription>{errors.general[0]}</AlertDescription>
                        </Alert>
                    )}

                    {warnings.length > 0 && (
                        <Alert>
                            <AlertDescription>
                                <h4 className="font-semibold text-sm mb-2">Warnings:</h4>
                                <ul className="text-sm space-y-1">
                                    {warnings.map((warning, idx) => (
                                        <li key={idx}>{warning.message}</li>
                                    ))}
                                </ul>
                                <p className="text-xs mt-2 text-muted-foreground">You can still save, but please review the conflicts.</p>
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="employee_id">Employee *</Label>
                        <Select
                            value={formData.employee_id.toString()}
                            onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                        >
                            <SelectTrigger id="employee_id">
                                <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.isArray(employees) && employees.map((employee) => (
                                    <SelectItem key={employee.id} value={employee.id.toString()}>
                                        {employee.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.employee_id && (
                            <p className="text-destructive text-sm">{errors.employee_id}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Type *</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(value) => setFormData({ ...formData, type: value })}
                        >
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="project">Project</SelectItem>
                                <SelectItem value="sla">SLA</SelectItem>
                                <SelectItem value="misc">Miscellaneous</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.type && (
                            <p className="text-destructive text-sm">{errors.type}</p>
                        )}
                    </div>

                    {formData.type === 'project' && (
                        <div className="space-y-2">
                            <Label htmlFor="project_id">Project *</Label>
                            <Select
                                value={formData.project_id.toString()}
                                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                            >
                                <SelectTrigger id="project_id">
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.isArray(projects) && projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id.toString()}>
                                            {project.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.project_id && (
                                <p className="text-destructive text-sm">{errors.project_id}</p>
                            )}
                        </div>
                    )}

                    {(formData.type === 'sla' || formData.type === 'misc') && (
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required={formData.type === 'sla' || formData.type === 'misc'}
                            />
                            {errors.title && (
                                <p className="text-destructive text-sm">{errors.title}</p>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start_date">Start Date *</Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                required
                            />
                            {errors.start_date && (
                                <p className="text-destructive text-sm">{errors.start_date}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="end_date">End Date *</Label>
                            <Input
                                id="end_date"
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                required
                            />
                            {errors.end_date && (
                                <p className="text-destructive text-sm">{errors.end_date}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="days_per_week">Days Per Week *</Label>
                        <Input
                            id="days_per_week"
                            type="number"
                            step="0.5"
                            min="0"
                            max="7"
                            value={formData.days_per_week}
                            onChange={(e) => setFormData({ ...formData, days_per_week: parseFloat(e.target.value) })}
                            required
                        />
                        {errors.days_per_week && (
                            <p className="text-destructive text-sm">{errors.days_per_week}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                        />
                        {errors.notes && (
                            <p className="text-destructive text-sm">{errors.notes}</p>
                        )}
                    </div>

                    <div className="flex justify-between pt-6 border-t border-border">
                        {allocation && !allocation._isTemporary && onDelete ? (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete this allocation?')) {
                                        onDelete(allocation.id);
                                        onClose();
                                    }
                                }}
                                disabled={processing}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        ) : (
                            <div></div>
                        )}
                        <div className="flex gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Saving...' : 'Save Allocation'}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

