import { NextRequest, NextResponse } from 'next/server';

// Хранилище для SSE-подключений
class SSEConnection {
  private writer: WritableStreamDefaultWriter;
  private timer: NodeJS.Timeout;
  
  constructor(writer: WritableStreamDefaultWriter) {
    this.writer = writer;
    this.timer = setInterval(() => this.heartbeat(), 15000); // Отправляем heartbeat каждые 15 секунд
  }
  
  send(data: any) {
    this.writer.write(`data: ${JSON.stringify(data)}\n\n`);
  }
  
  heartbeat() {
    this.writer.write(`:\n\n`); // Комментарий для поддержания соединения
  }
  
  close() {
    clearInterval(this.timer);
    this.writer.close();
  }
}

const connections = new Set<SSEConnection>();

// Функция для отправки обновлений всем подключенным клиентам
export function broadcastProgress(progress: number, status: string) {
  connections.forEach(connection => {
    connection.send({ progress, status, timestamp: new Date().toISOString() });
  });
}

export async function GET(request: NextRequest) {
  // Устанавливаем заголовки для SSE
  const headers = new Headers();
  headers.set('Content-Type', 'text/event-stream');
  headers.set('Cache-Control', 'no-cache');
  headers.set('Connection', 'keep-alive');
  headers.set('X-Accel-Buffering', 'no'); // Отключаем буферизацию в Nginx

  // Создаем потоковый ответ
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  
  // Создаем новый объект-обертку для подключения
  const connection = new SSEConnection(writer);
  connections.add(connection);
  
  // Отправляем событие подключения
  connection.send({ event: 'connected', status: 'Подключено к серверу' });
  
  // Обработка закрытия соединения
  request.signal.onabort = () => {
    connections.delete(connection);
    connection.close();
  };
  
  return new NextResponse(readable, { headers });
}

// Экспортируем типы для предотвращения ошибок типизации
export const config = { runtime: 'edge' };