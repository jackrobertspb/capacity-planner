<?php

namespace App\Filament\Pages;

use Filament\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    protected string $view = 'filament.pages.dashboard';

    public function getWidgets(): array
    {
        return [
            // Custom widgets will go here
        ];
    }

    public function getColumns(): int | array
    {
        return 2;
    }
}
