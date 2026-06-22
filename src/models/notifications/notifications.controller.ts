import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  Req,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import { NotificationsService } from './notifications.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { TokenClaim } from '../../common/interfaces/login.interface';

@Controller('notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('stream')
  async stream(@Res() res: Response, @Request() request: TokenClaim) {
    const subjectType = request.user.subject_type;
    const subjectId = request.user.sub;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const client = res;
    if (subjectType === 'user') {
      this.notificationsService.registerClient(subjectId, client as any);
    } else {
      this.notificationsService.registerEmployeeClient(
        subjectId,
        client as any,
      );
    }

    res.write(': connected\n\n');
  }

  @Get()
  async list(
    @Req() req: Request,
    @Query('status') status?: 'unread' | 'read',
    @Query('limit') limit?: string,
  ) {
    const subjectType = (req as any).subjectType as 'user' | 'employee';
    const subjectId = (req as any).subjectId as string;
    const parsedLimit = Math.min(parseInt(limit ?? '50', 10) || 50, 100);
    return this.notificationsService.list(
      { type: subjectType, id: subjectId } as any,
      { status, limit: parsedLimit },
    );
  }

  @Post(':id/read')
  async markRead(@Req() req: Request, @Param('id') id: string) {
    const subjectType = (req as any).subjectType as 'user' | 'employee';
    const subjectId = (req as any).subjectId as string;
    await this.notificationsService.markRead(
      { type: subjectType, id: subjectId } as any,
      id,
    );
    return { ok: true };
  }

  @Post('read-all')
  async markAllRead(@Req() req: Request) {
    const subjectType = (req as any).subjectType as 'user' | 'employee';
    const subjectId = (req as any).subjectId as string;
    const count = await this.notificationsService.markAllRead({
      type: subjectType,
      id: subjectId,
    } as any);
    return { ok: true, count };
  }
}
