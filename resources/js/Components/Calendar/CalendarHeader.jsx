import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarHeader({ currentDate, view, onViewChange, onNavigate, onToday }) {
    const getDateLabel = () => {
        if (view === 'day') {
            return format(currentDate, 'EEEE, MMMM d, yyyy');
        } else if (view === 'week') {
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
        } else {
            return format(currentDate, 'MMMM yyyy');
        }
    };

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-4">
            <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground min-w-[200px]">
                    {getDateLabel()}
                </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                {/* Navigation */}
                <div className="flex items-center gap-0.5 bg-muted rounded p-0.5">
                    <button
                        onClick={() => onNavigate('prev')}
                        className="p-1.5 hover:bg-background rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Previous"
                        title={`Previous ${view}`}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onToday}
                        className="px-3 py-1.5 text-xs font-medium hover:bg-background rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Go to today"
                    >
                        Today
                    </button>
                    <button
                        onClick={() => onNavigate('next')}
                        className="p-1.5 hover:bg-background rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Next"
                        title={`Next ${view}`}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                {/* View Type Toggle */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onViewChange('day')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md border-2 transition-all cursor-pointer ${
                            view === 'day'
                                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                : 'bg-background text-foreground border-border hover:border-primary hover:bg-primary/5'
                        }`}
                        title="Switch to day view"
                    >
                        Day
                    </button>
                    <button
                        onClick={() => onViewChange('week')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md border-2 transition-all cursor-pointer ${
                            view === 'week'
                                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                : 'bg-background text-foreground border-border hover:border-primary hover:bg-primary/5'
                        }`}
                        title="Switch to week view"
                    >
                        Week
                    </button>
                    <button
                        onClick={() => onViewChange('month')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md border-2 transition-all cursor-pointer ${
                            view === 'month'
                                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                : 'bg-background text-foreground border-border hover:border-primary hover:bg-primary/5'
                        }`}
                        title="Switch to month view"
                    >
                        Month
                    </button>
                </div>
            </div>
        </div>
    );
}

