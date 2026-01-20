import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Edit2, Trash2, Calendar, Clock } from 'lucide-react';

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
            className="text-xs px-2 py-1 rounded truncate cursor-pointer relative group font-normal transition-all"
            style={{
                backgroundColor: allocation.project?.color || '#3b82f6',
                color: 'white',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={`${getDisplayText()}: ${format(parseISO(allocation.start_date), 'MMM d')} - ${format(parseISO(allocation.end_date), 'MMM d')} (${allocation.days_per_week} days/week)${allocation.notes ? '\n' + allocation.notes : ''}`}
        >
            <div className="flex items-center gap-1.5">
                <span className="truncate">{getDisplayText()}</span>
                <span className="text-[10px] opacity-70 whitespace-nowrap">• {allocation.days_per_week}d/w</span>
            </div>
            {hovered && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded shadow-xl p-2 z-30 flex flex-col gap-2 min-w-[180px]">
                    <div className="flex flex-col gap-1 text-[11px] text-foreground pb-2 border-b border-border">
                        <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="h-3 w-3 text-primary" />
                            <span>{format(parseISO(allocation.start_date), 'MMM d')} - {format(parseISO(allocation.end_date), 'MMM d')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{allocation.days_per_week} days/week</span>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(allocation);
                            }}
                            className="flex-1 px-2 py-1 hover:bg-primary/10 rounded transition-colors flex items-center justify-center gap-1 text-primary text-[11px] font-medium"
                            title="Edit"
                        >
                            <Edit2 className="h-3 w-3" />
                            Edit
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this allocation?')) {
                                    onDelete(allocation.id);
                                }
                            }}
                            className="flex-1 px-2 py-1 hover:bg-destructive/10 rounded text-destructive transition-colors flex items-center justify-center gap-1 text-[11px] font-medium"
                            title="Delete"
                        >
                            <Trash2 className="h-3 w-3" />
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

