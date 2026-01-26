import { useState } from 'react';
import { router } from '@inertiajs/react';
import { X } from 'lucide-react';

export default function AllocationForm({ allocation, employees = [], projects = [], onClose, onSave }) {
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                    <h3 className="text-xl font-bold text-foreground">
                        {allocation ? 'Edit Allocation' : 'New Allocation'}
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

                    {warnings.length > 0 && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                            <h4 className="font-semibold text-sm mb-2">Warnings:</h4>
                            <ul className="text-sm space-y-1">
                                {warnings.map((warning, idx) => (
                                    <li key={idx}>{warning.message}</li>
                                ))}
                            </ul>
                            <p className="text-xs mt-2 text-muted-foreground">You can still save, but please review the conflicts.</p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="employee_id" className="block text-sm font-medium mb-2">
                            Employee *
                        </label>
                        <select
                            id="employee_id"
                            value={formData.employee_id}
                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                            required
                        >
                            <option value="">Select employee</option>
                            {Array.isArray(employees) && employees.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                    {employee.name}
                                </option>
                            ))}
                        </select>
                        {errors.employee_id && (
                            <div className="text-destructive text-sm mt-1">{errors.employee_id}</div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="type" className="block text-sm font-medium mb-2">
                            Type *
                        </label>
                        <select
                            id="type"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                            required
                        >
                            <option value="project">Project</option>
                            <option value="sla">SLA</option>
                            <option value="misc">Miscellaneous</option>
                        </select>
                        {errors.type && (
                            <div className="text-destructive text-sm mt-1">{errors.type}</div>
                        )}
                    </div>

                    {formData.type === 'project' && (
                        <div>
                            <label htmlFor="project_id" className="block text-sm font-medium mb-2">
                                Project *
                            </label>
                            <select
                                id="project_id"
                                value={formData.project_id}
                                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                required={formData.type === 'project'}
                            >
                                <option value="">Select project</option>
                                {Array.isArray(projects) && projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                            {errors.project_id && (
                                <div className="text-destructive text-sm mt-1">{errors.project_id}</div>
                            )}
                        </div>
                    )}

                    {(formData.type === 'sla' || formData.type === 'misc') && (
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
                                required={formData.type === 'sla' || formData.type === 'misc'}
                            />
                            {errors.title && (
                                <div className="text-destructive text-sm mt-1">{errors.title}</div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start_date" className="block text-sm font-medium mb-2">
                                Start Date *
                            </label>
                            <input
                                id="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                required
                            />
                            {errors.start_date && (
                                <div className="text-destructive text-sm mt-1">{errors.start_date}</div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="end_date" className="block text-sm font-medium mb-2">
                                End Date *
                            </label>
                            <input
                                id="end_date"
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                required
                            />
                            {errors.end_date && (
                                <div className="text-destructive text-sm mt-1">{errors.end_date}</div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="days_per_week" className="block text-sm font-medium mb-2">
                            Days Per Week *
                        </label>
                            <input
                                id="days_per_week"
                                type="number"
                                step="0.5"
                                min="0"
                                max="7"
                                value={formData.days_per_week}
                                onChange={(e) => setFormData({ ...formData, days_per_week: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                            required
                        />
                        {errors.days_per_week && (
                            <div className="text-destructive text-sm mt-1">{errors.days_per_week}</div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium mb-2">
                            Notes
                        </label>
                        <textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {errors.notes && (
                            <div className="text-destructive text-sm mt-1">{errors.notes}</div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium border border-input rounded-lg hover:bg-muted transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all cursor-pointer"
                        >
                            {processing ? 'Saving...' : 'Save Allocation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

