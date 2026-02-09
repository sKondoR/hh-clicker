import { connections, SSEConnection } from '@/lib/sse';
import { NextRequest, NextResponse } from 'next/server';

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
