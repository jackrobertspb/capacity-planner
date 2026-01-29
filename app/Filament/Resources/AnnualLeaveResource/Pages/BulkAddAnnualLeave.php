<?php

namespace App\Filament\Resources\AnnualLeaveResource\Pages;

use App\Filament\Resources\AnnualLeaveResource;
use App\Models\AnnualLeave;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\Page;
use Illuminate\Support\Carbon;

class BulkAddAnnualLeave extends Page
{
    protected static string $resource = AnnualLeaveResource::class;

    protected string $view = 'filament.resources.annual-leave-resource.pages.bulk-add-annual-leave';

    public ?array $data = [];

    public function mount(): void
    {
        $this->form->fill();
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('user_ids')
                    ->label('Employees')
                    ->multiple()
                    ->options(User::where('role', '!=', 'guest')->pluck('name', 'id'))
                    ->searchable()
                    ->preload()
                    ->required()
                    ->helperText('Select one or more employees'),
                
                Forms\Components\DatePicker::make('start_date')
                    ->label('Start Date')
                    ->required()
                    ->native(false)
                    ->displayFormat('Y-m-d')
                    ->default(now()),
                
                Forms\Components\DatePicker::make('end_date')
                    ->label('End Date')
                    ->required()
                    ->native(false)
                    ->displayFormat('Y-m-d')
                    ->default(now())
                    ->after('start_date'),
                
                Forms\Components\Textarea::make('notes')
                    ->label('Notes')
                    ->rows(3)
                    ->columnSpanFull(),
            ])
            ->statePath('data');
    }

    public function submit(): void
    {
        $data = $this->form->getState();
        
        $startDate = Carbon::parse($data['start_date']);
        $endDate = Carbon::parse($data['end_date']);
        $daysCount = $startDate->diffInDays($endDate) + 1;

        $created = 0;
        foreach ($data['user_ids'] as $userId) {
            AnnualLeave::create([
                'user_id' => $userId,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'days_count' => $daysCount,
                'notes' => $data['notes'] ?? null,
            ]);
            $created++;
        }

        Notification::make()
            ->success()
            ->title('Success')
            ->body("Created {$created} annual leave record(s).")
            ->send();

        $this->form->fill();
    }

    protected function getFormActions(): array
    {
        return [
            \Filament\Actions\Action::make('submit')
                ->label('Create Leave Records')
                ->submit('submit'),
        ];
    }
}

