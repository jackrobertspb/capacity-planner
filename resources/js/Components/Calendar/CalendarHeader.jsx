import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarHeader({ currentDate, onToday, onScrollLeft, onScrollRight }) {
    return (
        <div className="flex justify-center items-center px-4">
            <div className="flex items-center gap-1 bg-card border border-border rounded-lg px-1 py-1">
                <button
                    onClick={onScrollLeft}
                    className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Scroll left"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                    onClick={onToday}
                    className="px-4 py-1.5 text-sm font-medium bg-muted hover:bg-muted/80 rounded transition-colors text-foreground cursor-pointer"
                    title="Go to today"
                >
                    Today
                </button>
                <button
                    onClick={onScrollRight}
                    className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Scroll right"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

