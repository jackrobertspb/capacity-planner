<?php

namespace App\Filament\Resources;

use App\Filament\Resources\AnnualLeaveResource\Pages;
use App\Models\AnnualLeave;
use App\Models\User;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

class AnnualLeaveResource extends Resource
{
    protected static ?string $model = AnnualLeave::class;

    protected static ?int $navigationSort = 3;

    public static function getNavigationIcon(): ?string
    {
        return 'heroicon-o-calendar-days';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                Forms\Components\Select::make('user_id')
                    ->label('Employee')
                    ->relationship('user', 'name')
                    ->searchable()
                    ->preload()
                    ->required(),
                
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
                
                Forms\Components\TextInput::make('days_count')
                    ->label('Days Count')
                    ->numeric()
                    ->required()
                    ->minValue(1)
                    ->helperText('Total number of leave days')
                    ->default(1),
                
                Forms\Components\Textarea::make('notes')
                    ->label('Notes')
                    ->rows(3)
                    ->columnSpanFull(),
            ])
            ->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Employee')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('start_date')
                    ->date()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('end_date')
                    ->date()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('days_count')
                    ->label('Days')
                    ->suffix(' days')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('notes')
                    ->limit(30)
                    ->wrap(),
                
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('user_id')
                    ->label('Employee')
                    ->relationship('user', 'name')
                    ->searchable()
                    ->preload(),
                
                Tables\Filters\Filter::make('start_date')
                    ->form([
                        Forms\Components\DatePicker::make('start_from')
                            ->label('Start From'),
                        Forms\Components\DatePicker::make('start_until')
                            ->label('Start Until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['start_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('start_date', '>=', $date),
                            )
                            ->when(
                                $data['start_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('start_date', '<=', $date),
                            );
                    }),
            ])
            ->defaultSort('start_date', 'desc')
            ->recordAction(null)
            ->recordUrl(fn ($record) => static::getUrl('edit', ['record' => $record]));
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListAnnualLeave::route('/'),
            'create' => Pages\CreateAnnualLeave::route('/create'),
            'edit' => Pages\EditAnnualLeave::route('/{record}/edit'),
            'bulk-add' => Pages\BulkAddAnnualLeave::route('/bulk-add'),
        ];
    }
}

