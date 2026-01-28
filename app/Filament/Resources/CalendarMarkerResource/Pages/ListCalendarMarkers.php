<?php

namespace App\Filament\Resources\CalendarMarkerResource\Pages;

use App\Filament\Resources\CalendarMarkerResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListCalendarMarkers extends ListRecords
{
    protected static string $resource = CalendarMarkerResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}


