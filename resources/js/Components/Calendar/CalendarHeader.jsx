import { format } from 'date-fns';

export default function CalendarHeader({ currentDate, onToday }) {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-4">
            <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground min-w-[200px]">
                    {format(currentDate, 'MMMM yyyy')}
                </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={onToday}
                    className="px-3 py-1.5 text-xs font-medium bg-muted hover:bg-background rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Go to today"
                >
                    Today
                </button>
            </div>
        </div>
    );
}

