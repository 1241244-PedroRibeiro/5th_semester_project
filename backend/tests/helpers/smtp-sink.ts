import { createServer, Socket } from 'node:net';

/** Local-only SMTP capture for tests; never connects to an external mail provider. */
export async function createSmtpSink(): Promise<{ port: number; messages: string[]; close: () => Promise<void> }> {
	const messages: string[] = [];
	const sockets = new Set<Socket>();
	const server = createServer(socket => {
		sockets.add(socket);
		socket.on('close', () => sockets.delete(socket));
		socket.on('error', () => undefined);
		socket.setEncoding('utf8');
		let buffer = '';
		let data: string[] | null = null;
		socket.write('220 localhost SMTP test sink\r\n');
		socket.on('data', chunk => {
			buffer += chunk;
			let position: number;
			while ((position = buffer.indexOf('\r\n')) >= 0) {
				const line = buffer.slice(0, position);
				buffer = buffer.slice(position + 2);
				if (data !== null) {
					if (line === '.') { messages.push(data.join('\r\n')); data = null; socket.write('250 Message accepted\r\n'); }
					else data.push(line.startsWith('..') ? line.slice(1) : line);
				} else if (/^EHLO|^HELO/i.test(line)) socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');
				else if (/^AUTH /i.test(line)) socket.write('235 Authenticated\r\n');
				else if (line === 'DATA') { data = []; socket.write('354 End with a dot\r\n'); }
				else if (line === 'QUIT') socket.end('221 Bye\r\n');
				else socket.write('250 OK\r\n');
			}
		});
	});
	await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve()); });
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Missing SMTP test port');
	return { port: address.port, messages, close: () => new Promise<void>((resolve, reject) => {
		for (const socket of sockets) socket.destroy();
		server.close(error => error ? reject(error) : resolve());
	}) };
}
