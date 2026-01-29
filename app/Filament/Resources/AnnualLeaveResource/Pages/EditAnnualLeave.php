<?php

namespace App\Filament\Resources\AnnualLeaveResource\Pages;

use App\Filament\Resources\AnnualLeaveResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditAnnualLeave extends EditRecord
{
    protected static string $resource = AnnualLeaveResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}


