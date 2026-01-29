import { format, parseISO } from 'date-fns';

export default function AllocationBlock({ allocation, onEdit, onDelete }) {
    const getDisplayText = () => {
        if (allocation.title) {
            return allocation.title;
        }
        if (allocation.project) {
            return allocation.project.name;
        }
        return allocation.type;
    };

    const handleClick = (e) => {
        e.stopPropagation();
        onEdit(allocation);
    };

    return (
        <div
            className="text-xs px-2 py-1 rounded truncate cursor-pointer relative group font-normal transition-all hover:opacity-90 hover:shadow-md"
            style={{
                backgroundColor: allocation.project?.color || '#3b82f6',
                color: 'white',
            }}
            onClick={handleClick}
            title={`${getDisplayText()}: ${format(parseISO(allocation.start_date), 'MMM d')} - ${format(parseISO(allocation.end_date), 'MMM d')} (${allocation.days_per_week} days/week)${allocation.notes ? '\n' + allocation.notes : ''}\n\nClick to edit`}
        >
            <div className="flex items-center gap-1.5">
                <span className="truncate">{getDisplayText()}</span>
            </div>
        </div>
    );
}

