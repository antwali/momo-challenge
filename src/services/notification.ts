import { config } from '../config';

export type NotificationPayload = {
  channel: 'sms' | 'whatsapp' | 'push';
  to: string;
  message: string;
  subject?: string;
};

/**
 * Mock notification service: logs to console in dev.
 * Replace with real SMS/WhatsApp integration in production.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  if (config.notificationChannel === 'console') {
    console.log('[Notification]', payload.channel, '->', payload.to, payload.message);
    return;
  }
  // Future: call Twilio, WhatsApp Business API, etc.
}
