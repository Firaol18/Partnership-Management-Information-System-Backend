import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { CreateNotificationDto } from './dto';

type NotificationPayload = {
  title: string;
  body: string;
  link?: string;
  priority?: 'low' | 'normal' | 'high';
  data?: Record<string, any>;
};

type NotificationRecord = {
  id: string;
  user_id?: string;
  employee_id?: string;
  type: string;
  payload: any;
  status: string;
  created_at: Date;
  updated_at: Date;
  expires_at?: Date | null;
};

export type SseClient = {
  write: (chunk: string) => void;
  on: (event: string, listener: (...args: any[]) => void) => void;
  flushHeaders?: () => void;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly userIdToClients = new Map<string, Set<SseClient>>();
  private readonly employeeIdToClients = new Map<string, Set<SseClient>>();

  constructor(private readonly db: DatabaseService) {}

  async createForUser(
    userId: string,
    type: string,
    payload: NotificationPayload,
  ): Promise<NotificationRecord> {
    const record = await this.db.notification.create({
      data: {
        user_id: userId,
        type,
        payload,
        status: 'unread',
      },
    });

    this.emitToUser(userId, record);
    this.logger.debug(`Notification created and emitted for user`, {
      userId,
      type,
    });
    return record as NotificationRecord;
  }

  async createForEmployee(
    employeeId: string,
    type: string,
    payload: NotificationPayload,
  ): Promise<NotificationRecord> {
    const record = await this.db.notification.create({
      data: {
        employee_id: employeeId,
        type,
        payload,
        status: 'unread',
      },
    });

    this.emitToEmployee(employeeId, record);
    this.logger.debug(`Notification created and emitted for employee`, {
      employeeId,
      type,
    });
    return record as NotificationRecord;
  }

  async list(
    subject: { type: 'user'; id: string } | { type: 'employee'; id: string },
    opts: { status?: 'unread' | 'read'; limit?: number } = {},
  ): Promise<NotificationRecord[]> {
    const { status, limit = 50 } = opts;
    const where =
      subject.type === 'user'
        ? { user_id: subject.id, ...(status ? { status } : {}) }
        : { employee_id: subject.id, ...(status ? { status } : {}) };
    const records = await this.db.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    return records as NotificationRecord[];
  }

  async markRead(
    subject: { type: 'user'; id: string } | { type: 'employee'; id: string },
    id: string,
  ): Promise<void> {
    const updated = await this.db.notification.updateMany({
      where:
        subject.type === 'user'
          ? { id, user_id: subject.id }
          : { id, employee_id: subject.id },
      data: { status: 'read' },
    });
    if (updated.count === 0) {
      this.logger.warn(
        `No notification updated (not found or not owned)`,
        subject.type === 'user'
          ? { userId: subject.id, id }
          : { employeeId: subject.id, id },
      );
    }
  }

  async markAllRead(
    subject: { type: 'user'; id: string } | { type: 'employee'; id: string },
  ): Promise<number> {
    const updated = await this.db.notification.updateMany({
      where:
        subject.type === 'user'
          ? { user_id: subject.id, status: 'unread' }
          : { employee_id: subject.id, status: 'unread' },
      data: { status: 'read' },
    });
    return updated.count as number;
  }

  registerClient(userId: string, client: SseClient): void {
    if (!this.userIdToClients.has(userId)) {
      this.userIdToClients.set(userId, new Set());
    }
    const set = this.userIdToClients.get(userId)!;
    set.add(client);
    this.logger.debug(`Client registered`, { userId, clients: set.size });

    client.on('close', () => {
      this.unregisterClient(userId, client);
    });
  }

  unregisterClient(userId: string, client: SseClient): void {
    const set = this.userIdToClients.get(userId);
    if (!set) return;
    set.delete(client);
    if (set.size === 0) {
      this.userIdToClients.delete(userId);
    }
    this.logger.debug(`Client unregistered`, {
      userId,
      remaining: set?.size ?? 0,
    });
  }

  emitToUser(userId: string, notification: NotificationRecord): void {
    const clients = this.userIdToClients.get(userId);
    if (!clients || clients.size === 0) return;
    const data =
      `event: notification\n` + `data: ${JSON.stringify(notification)}\n\n`;
    for (const client of clients) {
      try {
        client.write(data);
      } catch (err) {
        this.logger.warn(`Failed to write SSE to client`, {
          userId,
          err: (err as Error).message,
        });
      }
    }
  }

  registerEmployeeClient(employeeId: string, client: SseClient): void {
    if (!this.employeeIdToClients.has(employeeId)) {
      this.employeeIdToClients.set(employeeId, new Set());
    }
    const set = this.employeeIdToClients.get(employeeId)!;
    set.add(client);
    this.logger.debug(`Employee client registered`, {
      employeeId,
      clients: set.size,
    });

    client.on('close', () => {
      this.unregisterEmployeeClient(employeeId, client);
    });
  }

  unregisterEmployeeClient(employeeId: string, client: SseClient): void {
    const set = this.employeeIdToClients.get(employeeId);
    if (!set) return;
    set.delete(client);
    if (set.size === 0) {
      this.employeeIdToClients.delete(employeeId);
    }
    this.logger.debug(`Employee client unregistered`, {
      employeeId,
      remaining: set?.size ?? 0,
    });
  }

  emitToEmployee(employeeId: string, notification: NotificationRecord): void {
    const clients = this.employeeIdToClients.get(employeeId);
    if (!clients || clients.size === 0) return;
    const data =
      `event: notification\n` + `data: ${JSON.stringify(notification)}\n\n`;
    for (const client of clients) {
      try {
        client.write(data);
      } catch (err) {
        this.logger.warn(`Failed to write SSE to employee client`, {
          employeeId,
          err: (err as Error).message,
        });
      }
    }
  }

  async createNotification(
    dto: CreateNotificationDto,
  ): Promise<NotificationRecord> {
    const record = await this.db.notification.create({
      data: dto,
    });
    return record as NotificationRecord;
  }
}
