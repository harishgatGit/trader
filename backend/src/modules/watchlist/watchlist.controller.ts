import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard, Roles } from '../auth/role.guard';

class AddWatchlistDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  @Matches(/^[A-Z0-9.]+$/i)
  symbol: string;
}

@Controller('watchlist')
@UseGuards(AuthGuard, RoleGuard)
@Roles('BASIC', 'PRO', 'MAX', 'ADMIN', 'SUPERUSER')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  async getAll() {
    return this.watchlistService.getAll();
  }

  @Post()
  async add(@Body() dto: AddWatchlistDto) {
    return this.watchlistService.add(dto.symbol);
  }

  @Delete(':symbol')
  async remove(@Param('symbol') symbol: string) {
    return this.watchlistService.remove(symbol);
  }
}
