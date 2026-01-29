<?php

namespace App\Filament\Resources\AnnualLeaveResource\Pages;

use App\Filament\Resources\AnnualLeaveResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListAnnualLeave extends ListRecords
{
    protected static string $resource = AnnualLeaveResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
            Actions\Action::make('bulkAdd')
                ->label('Bulk Add')
                ->icon('heroicon-o-plus-circle')
                ->url(static::getResource()::getUrl('bulk-add')),
        ];
    }
}


