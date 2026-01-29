<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Models\AnnualLeave;
use App\Models\User;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Hash;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationLabel = 'Employees';

    protected static ?string $modelLabel = 'Employee';

    protected static ?string $pluralModelLabel = 'Employees';

    protected static ?int $navigationSort = 1;

    public static function getNavigationIcon(): ?string
    {
        return 'heroicon-o-users';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                Forms\Components\TextInput::make('name')
                    ->required()
                    ->maxLength(255)
                    ->columnSpanFull(),
                
                Forms\Components\TextInput::make('email')
                    ->email()
                    ->required()
                    ->unique(ignoreRecord: true)
                    ->maxLength(255)
                    ->columnSpanFull(),
                
                Forms\Components\Select::make('role')
                    ->options([
                        'guest' => 'Guest',
                        'user' => 'User',
                        'admin' => 'Admin',
                    ])
                    ->default('user')
                    ->required(),
                
                Forms\Components\TextInput::make('password')
                    ->password()
                    ->dehydrateStateUsing(fn ($state) => Hash::make($state))
                    ->dehydrated(fn ($state) => filled($state))
                    ->required(fn (string $context): bool => $context === 'create')
                    ->maxLength(255)
                    ->helperText('Leave blank to keep current password'),

                Forms\Components\CheckboxList::make('work_days')
                    ->label('Working Days')
                    ->options([
                        0 => 'Sunday',
                        1 => 'Monday',
                        2 => 'Tuesday',
                        3 => 'Wednesday',
                        4 => 'Thursday',
                        5 => 'Friday',
                        6 => 'Saturday',
                    ])
                    ->default([1, 2, 3, 4, 5])
                    ->columns(4)
                    ->helperText('Select the days this employee works')
                    ->columnSpanFull(),
                
                Forms\Components\TextInput::make('annual_leave_default')
                    ->label('Annual Leave Days')
                    ->numeric()
                    ->default(25)
                    ->required()
                    ->minValue(0)
                    ->maxValue(365)
                    ->helperText('Default number of annual leave days per year'),

                Forms\Components\Toggle::make('is_visible')
                    ->label('Visible in Calendar')
                    ->default(true)
                    ->helperText('Show this employee in the calendar view'),
            ])
            ->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('email')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('role')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'guest' => 'gray',
                        'user' => 'info',
                        'admin' => 'success',
                    })
                    ->searchable(),
                
                Tables\Columns\TextColumn::make('work_days')
                    ->label('Work Days')
                    ->formatStateUsing(function ($state) {
                        if (!is_array($state) || empty($state)) {
                            return 'Not set';
                        }
                        $days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        return collect($state)
                            ->sort()
                            ->map(fn($day) => $days[$day] ?? '')
                            ->filter()
                            ->implode(', ');
                    })
                    ->wrap(),
                
                Tables\Columns\TextColumn::make('annual_leave_default')
                    ->label('Annual Leave')
                    ->suffix(' days')
                    ->sortable(),
                
                Tables\Columns\IconColumn::make('is_visible')
                    ->label('Visible')
                    ->boolean()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                
                Tables\Columns\TextColumn::make('deleted_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('role')
                    ->options([
                        'guest' => 'Guest',
                        'user' => 'User',
                        'admin' => 'Admin',
                    ]),
                
                Tables\Filters\TernaryFilter::make('is_visible')
                    ->label('Visible in Calendar')
                    ->placeholder('All employees')
                    ->trueLabel('Visible only')
                    ->falseLabel('Hidden only'),
                
                Tables\Filters\TrashedFilter::make(),
            ])
            ->recordAction(null)
            ->recordUrl(fn ($record) => static::getUrl('edit', ['record' => $record]))
            ->bulkActions([
                // Bulk actions will be added once we verify the basic table works
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'edit' => Pages\EditUser::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([
                SoftDeletingScope::class,
            ]);
    }
}

