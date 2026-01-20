import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';

export default function AllocationBlock({ allocation, onEdit, onDelete }) {
    const [hovered, setHovered] = useState(false);

    const getDisplayText = () => {
        if (allocation.title) {
            return allocation.title;
        }
        if (allocation.project) {
            return allocation.project.name;
        }
        return allocation.type;
    };

    return (
        <div
            className="text-xs px-2 py-1 rounded-md truncate cursor-pointer relative group font-medium shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
            style={{
                backgroundColor: allocation.project?.color || '#3b82f6',
                color: 'white',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={`${getDisplayText()}: ${format(parseISO(allocation.start_date), 'MMM d')} - ${format(parseISO(allocation.end_date), 'MMM d')} (${allocation.days_per_week} days/week)${allocation.notes ? '\n' + allocation.notes : ''}`}
        >
            {getDisplayText()}
            {hovered && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-md shadow-lg p-1 z-20 flex gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(allocation);
                        }}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="Edit"
                    >
                        <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this allocation?')) {
                                onDelete(allocation.id);
                            }
                        }}
                        className="p-1 hover:bg-muted rounded text-destructive transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

