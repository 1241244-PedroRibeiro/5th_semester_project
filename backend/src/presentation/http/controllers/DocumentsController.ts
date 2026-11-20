import {
	Controller,
	Get,
	Put,
	Delete,
	Param,
	Req,
	Res,
	UseGuards,
	HttpStatus,
	HttpCode,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { existsSync, readFileSync, writeFileSync, unlinkSync, statSync, mkdirSync, appendFileSync, lstatSync, realpathSync } from 'fs';
import { join, resolve, normalize, sep } from 'path';
import { JwtAuthGuard } from '../middlewares/JwtAuthGuard';
import { RolesGuard } from '../middlewares/roles.guard';
import { StatusGuard } from '../middlewares/UserStatus.guard';
import { Authenticated, Roles, CurrentUser, AuthenticatedUser, UserStatuses } from '../middlewares/decorators';
import { UserRole } from '../../../application/user/UserRoles';
import { UserStatus } from '../../../domain/user/UserStatus';

const DOCUMENTS_ROOT = '/shared/documents';
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

@Controller('documents')
@UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
export class DocumentsController {
	@Get('*')
	@Authenticated()
	@UserStatuses(UserStatus.ACTIVE)
	async getDocument(
		@Param() params: Record<string, string>,
		@CurrentUser() user: AuthenticatedUser,
		@Req() req: Request,
		@Res() res: Response,
	): Promise<void> {
		const path = params.path ?? params['0'] ?? '';
		await this.serveFile(path, user, req, res);
	}

	@Put('*')
	@Roles(UserRole.MANAGER)
	@UserStatuses(UserStatus.ACTIVE)
	async putDocument(
		@Param() params: Record<string, string>,
		@CurrentUser() user: AuthenticatedUser,
		@Req() req: Request,
		@Res() res: Response,
	): Promise<void> {
		const path = params.path ?? params['0'] ?? '';
		await this.writeFile(path, user, req, res);
	}

	@Delete('*')
	@Roles(UserRole.MANAGER)
	@UserStatuses(UserStatus.ACTIVE)
	@HttpCode(HttpStatus.NO_CONTENT)
	async deleteDocument(
		@Param() params: Record<string, string>,
		@CurrentUser() user: AuthenticatedUser,
		@Req() req: Request,
		@Res() res: Response,
	): Promise<void> {
		const path = params.path ?? params['0'] ?? '';
		await this.deleteFile(path, user, req, res);
	}

	private async serveFile(
		path: string,
		user: AuthenticatedUser,
		req: Request,
		res: Response,
	): Promise<void> {
		const safePath = this.resolveSafePath(path);
		if (!safePath) {
			this.auditLog(user, req, 'read', path, 'denied', 'path traversal');
			res.status(HttpStatus.BAD_REQUEST).send('Invalid path');
			return;
		}

		if (!existsSync(safePath) || !this.isRegularFileInsideRoot(safePath)) {
			this.auditLog(user, req, 'read', path, 'denied', 'not found');
			res.status(HttpStatus.NOT_FOUND).send('File not found');
			return;
		}

		const stats = statSync(safePath);
		if (!stats.isFile()) {
			this.auditLog(user, req, 'read', path, 'denied', 'not a file');
			res.status(HttpStatus.BAD_REQUEST).send('Not a file');
			return;
		}

		const fileContent = readFileSync(safePath);
		this.auditLog(user, req, 'read', path, 'success');

		res.setHeader('Content-Type', 'application/octet-stream');
		res.setHeader('Content-Length', stats.size);
		res.setHeader('Cache-Control', 'no-store');
		res.status(HttpStatus.OK).send(fileContent);
	}

	private async writeFile(
		path: string,
		user: AuthenticatedUser,
		req: Request,
		res: Response,
	): Promise<void> {
		const safePath = this.resolveSafePath(path);
		if (!safePath) {
			this.auditLog(user, req, 'write', path, 'denied', 'path traversal');
			res.status(HttpStatus.BAD_REQUEST).send('Invalid path');
			return;
		}

		const chunks: Buffer[] = [];
		for await (const chunk of req) {
			chunks.push(chunk);
		}
		const content = Buffer.concat(chunks);
		if (content.length > MAX_DOCUMENT_SIZE) {
			this.auditLog(user, req, 'write', path, 'denied', 'file too large');
			res.status(HttpStatus.PAYLOAD_TOO_LARGE).send('File too large');
			return;
		}

		const dir = resolve(safePath, '..');
		if (!existsSync(dir)) {
			this.auditLog(user, req, 'write', path, 'denied', 'parent directory not found');
			res.status(HttpStatus.NOT_FOUND).send('Parent directory not found');
			return;
		}

		if (existsSync(safePath) && !this.isRegularFileInsideRoot(safePath)) {
			this.auditLog(user, req, 'write', path, 'denied', 'not a regular file');
			res.status(HttpStatus.BAD_REQUEST).send('Invalid file');
			return;
		}

		const isNewFile = !existsSync(safePath);
		writeFileSync(safePath, content);

		this.auditLog(user, req, 'write', path, 'success');

		res.status(isNewFile ? HttpStatus.CREATED : HttpStatus.OK).send({
			message: isNewFile ? 'File created' : 'File updated',
			path,
		});
	}

	private async deleteFile(
		path: string,
		user: AuthenticatedUser,
		req: Request,
		res: Response,
	): Promise<void> {
		const safePath = this.resolveSafePath(path);
		if (!safePath) {
			this.auditLog(user, req, 'write', path, 'denied', 'path traversal');
			res.status(HttpStatus.BAD_REQUEST).send('Invalid path');
			return;
		}

		if (!existsSync(safePath) || !this.isRegularFileInsideRoot(safePath)) {
			this.auditLog(user, req, 'write', path, 'denied', 'not found');
			res.status(HttpStatus.NOT_FOUND).send('File not found');
			return;
		}

		const stats = statSync(safePath);
		if (!stats.isFile()) {
			this.auditLog(user, req, 'write', path, 'denied', 'not a file');
			res.status(HttpStatus.BAD_REQUEST).send('Not a file');
			return;
		}

		unlinkSync(safePath);
		this.auditLog(user, req, 'write', path, 'success');
		res.status(HttpStatus.NO_CONTENT).send();
	}

	private resolveSafePath(requestPath: string): string | null {
		if (!requestPath || requestPath.includes('\0')) {
			return null;
		}

		const normalized = normalize(requestPath);
		if (
			normalized === '..' ||
			normalized.startsWith(`..${sep}`) ||
			normalized.startsWith(sep) ||
			!['reports', 'operations'].includes(normalized.split(/[\\/]/, 1)[0])
		) {
			return null;
		}

		const fullPath = resolve(DOCUMENTS_ROOT, normalized);

		const resolvedRoot = resolve(DOCUMENTS_ROOT);
		if (fullPath !== resolvedRoot && !fullPath.startsWith(`${resolvedRoot}${sep}`)) {
			return null;
		}

		if (fullPath === resolvedRoot || !this.isPathWithinRoot(fullPath, resolvedRoot)) {
			return null;
		}

		return fullPath;
	}

	private isRegularFileInsideRoot(filePath: string): boolean {
		try {
			return lstatSync(filePath).isFile() && this.isRegularFilePathSafe(filePath, resolve(DOCUMENTS_ROOT));
		} catch {
			return false;
		}
	}

	private isPathWithinRoot(filePath: string, resolvedRoot: string): boolean {
		const parentPath = existsSync(filePath) ? filePath : resolve(filePath, '..');
		return this.isRegularFilePathSafe(parentPath, resolvedRoot);
	}

	private isRegularFilePathSafe(filePath: string, resolvedRoot: string): boolean {
		try {
			const realRoot = realpathSync(resolvedRoot);
			const realPath = realpathSync(filePath);
			return realPath.startsWith(`${realRoot}${sep}`);
		} catch {
			return false;
		}
	}

	private auditLog(
		user: AuthenticatedUser,
		req: Request,
		action: 'read' | 'write',
		path: string,
		result: 'success' | 'denied',
		reason?: string,
	): void {
		const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z/, 'Z');
		const ip = req.ip || req.socket.remoteAddress || 'unknown';
		const username = user?.username || 'unknown';
		const safeField = (value: string): string => value.replace(/[\r\n\t]/g, '_').replace(/\s+/g, '_');
		const logLine = `TS=${timestamp} ACTOR=${safeField(username)} ACTION=${action} PATH=${safeField(path)} RESULT=${result} SRC=${safeField(ip)}${reason ? ` REASON=${safeField(reason)}` : ''}`;

		const logDir = '/shared/logs/shared-access';
		const logFile = join(logDir, `${new Date().toISOString().split('T')[0].replace(/-/g, '')}.log`);

		if (!existsSync(logDir)) {
			mkdirSync(logDir, { recursive: true });
		}

		appendFileSync(logFile, logLine + '\n', { mode: 0o640 });
	}
}
