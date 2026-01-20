import { format, isSameDay, parseISO } from 'date-fns';
import { useState } from 'react';
import AllocationBlock from '../Allocation/AllocationBlock';
import { Edit2, Trash2, Plus } from 'lucide-react';

export default function CalendarCell({ date, row, viewMode, allocations, leave, markers, onAddAllocation, onEditAllocation, onDeleteAllocation, onAddMarker, onEditMarker, onDeleteMarker, isLastRow = false, isLastDay = false, isWeekend = false }) {
    const [hovered, setHovered] = useState(false);
    const isToday = isSameDay(date, new Date());
    const dateStr = format(date, 'yyyy-MM-dd');

    return (
        <td
            className={`border border-border p-2 min-h-[100px] relative transition-colors ${
                isToday ? 'bg-primary/10 border-primary' : isWeekend ? 'bg-muted/30' : 'bg-card hover:bg-muted/20'
            }`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="flex flex-col gap-0.5 h-full">
                {/* Allocations */}
                {allocations.map((alloc) => (
                    <AllocationBlock
                        key={alloc.id}
                        allocation={alloc}
                        onEdit={onEditAllocation}
                        onDelete={onDeleteAllocation}
                    />
                ))}

                {/* Annual Leave */}
                {leave.map((l) => (
                    <div
                        key={l.id}
                        className="text-xs px-2 py-1 rounded-md truncate bg-orange-500 text-white font-medium shadow-sm"
                        title={`Annual Leave: ${format(parseISO(l.start_date), 'MMM d')} - ${format(parseISO(l.end_date), 'MMM d')} (${l.days_count} days)`}
                    >
                        🏖️ Leave
                    </div>
                ))}

                {/* Calendar Markers */}
                {markers.map((marker) => (
                    <div
                        key={marker.id}
                        className="text-xs px-2 py-1 rounded-md truncate border-2 border-dashed relative group cursor-pointer font-medium transition-all hover:border-solid"
                        style={{
                            borderColor: marker.color,
                            color: marker.color,
                            backgroundColor: `${marker.color}10`,
                        }}
                        title={`${marker.title}: ${marker.description || ''}`}
                    >
                        📌 {marker.title}
                        {hovered && (
                            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-md shadow-lg p-1 z-20 flex gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditMarker(marker);
                                    }}
                                    className="p-1 hover:bg-muted rounded transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Are you sure you want to delete this marker?')) {
                                            onDeleteMarker(marker.id);
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
                ))}

                {/* Add buttons when hovering */}
                {hovered && (
                    <div className="flex gap-1 mt-2">
                        {onAddAllocation && (
                            <button
                                onClick={() => onAddAllocation(dateStr, row.id)}
                                className="text-xs px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded-md flex items-center gap-1 font-bold transition-colors border-2 border-primary/40"
                                title="Add allocation"
                            >
                                <Plus className="h-3 w-3" />
                                Allocation
                            </button>
                        )}
                        {onAddMarker && (
                            <button
                                onClick={() => onAddMarker(dateStr)}
                                className="text-xs px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded-md flex items-center gap-1 font-bold transition-colors border-2 border-primary/40"
                                title="Add marker"
                            >
                                <Plus className="h-3 w-3" />
                                Marker
                            </button>
                        )}
                    </div>
                )}
            </div>
        </td>
    );
}

