import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2 } from 'lucide-react';

export default function CalendarHeader({ currentDate, view, viewMode, onViewChange, onViewModeChange, onNavigate, onToday, onClearAllLeave }) {
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{getDateLabel()}</h2>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1 border-2 border-border">
                    <button
                        onClick={() => onViewModeChange('people')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                            viewMode === 'people'
                                ? 'bg-primary text-primary-foreground shadow-lg'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                        }`}
                    >
                        People
                    </button>
                    <button
                        onClick={() => onViewModeChange('project')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                            viewMode === 'project'
                                ? 'bg-primary text-primary-foreground shadow-lg'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                        }`}
                    >
                        Projects
                    </button>
                </div>

                {/* View Type Toggle */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1 border-2 border-border">
                    <button
                        onClick={() => onViewChange('day')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                            view === 'day'
                                ? 'bg-primary text-primary-foreground shadow-lg'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                        }`}
                    >
                        Day
                    </button>
                    <button
                        onClick={() => onViewChange('week')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                            view === 'week'
                                ? 'bg-primary text-primary-foreground shadow-lg'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                        }`}
                    >
                        Week
                    </button>
                    <button
                        onClick={() => onViewChange('month')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                            view === 'month'
                                ? 'bg-primary text-primary-foreground shadow-lg'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                        }`}
                    >
                        Month
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1 border-2 border-border">
                    <button
                        onClick={() => onNavigate('prev')}
                        className="p-2 hover:bg-primary/20 rounded-md transition-colors text-foreground hover:text-primary"
                        aria-label="Previous"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onToday}
                        className="px-4 py-2 text-sm font-bold hover:bg-primary/20 rounded-md transition-colors flex items-center gap-2 text-foreground hover:text-primary"
                    >
                        <CalendarIcon className="h-4 w-4" />
                        Today
                    </button>
                    <button
                        onClick={() => onNavigate('next')}
                        className="p-2 hover:bg-primary/20 rounded-md transition-colors text-foreground hover:text-primary"
                        aria-label="Next"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                {/* Testing: Clear All Leave */}
                {onClearAllLeave && (
                    <button
                        onClick={onClearAllLeave}
                        className="px-4 py-2 text-sm font-bold bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-lg transition-colors flex items-center gap-2 border-2 border-destructive/40"
                        title="Testing: Delete all leave entries"
                    >
                        <Trash2 className="h-4 w-4" />
                        Clear All Leave
                    </button>
                )}
            </div>
        </div>
    );
}

