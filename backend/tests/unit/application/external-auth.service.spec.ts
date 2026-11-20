import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ExternalAuthService } from '../../../src/application/auth/ExternalAuthService';
import { IUserRepository } from '../../../src/application/auth/IUserRepository';
import { ICustomerRepository } from '../../../src/application/customer/ICustomerRepository';
import { ITokenService } from '../../../src/application/auth/ISecurityServices';
import { IExchangeCodeStore } from '../../../src/application/auth/IExchangeCodeStore';
import { User } from '../../../src/domain/user/User';
import { UserStatus } from '../../../src/domain/user/UserStatus';

describe('ExternalAuthService (Application Unit Tests)', () => {
    let service: ExternalAuthService;
    let userRepoMock: jest.Mocked<IUserRepository>;
    let customerRepoMock: jest.Mocked<ICustomerRepository>;
    let tokenServiceMock: jest.Mocked<ITokenService>;
    let codeStoreMock: jest.Mocked<IExchangeCodeStore>;

    beforeEach(() => {
        userRepoMock = {
            findByExternalIdpSubject: jest.fn(),
            findByEmail: jest.fn(),
            findByUsername: jest.fn(),
            insert: jest.fn(),
            save: jest.fn(),
            exists: jest.fn(),
            findFiltered: jest.fn(),
        } as unknown as jest.Mocked<IUserRepository>;

        customerRepoMock = {
            insert: jest.fn(),
        } as unknown as jest.Mocked<ICustomerRepository>;

        tokenServiceMock = {
            generateToken: jest.fn(),
        } as unknown as jest.Mocked<ITokenService>;

        codeStoreMock = {
            put: jest.fn(),
            consume: jest.fn(),
        } as unknown as jest.Mocked<IExchangeCodeStore>;

        service = new ExternalAuthService(userRepoMock, customerRepoMock, tokenServiceMock, codeStoreMock);
    });

    describe('resolveUser', () => {
        it('deve rejeitar se o email não estiver verificado', async () => {
            await expect(service.resolveUser('sub-123', 'test@example.com', false))
                .rejects.toThrow(ForbiddenException);
        });

        it('deve retornar o utilizador se o "sub" já existir e estiver ativo', async () => {
                const mockUser = { status: UserStatus.ACTIVE, roles: new Set() } as User;
            userRepoMock.findByExternalIdpSubject.mockResolvedValue(mockUser);

            const result = await service.resolveUser('sub-123', 'test@example.com', true);
            expect(result).toBe(mockUser);
                expect(result.roles.size).toBe(0);
                expect(userRepoMock.findByEmail).not.toHaveBeenCalled();
            });

        it('deve rejeitar se o "sub" existir mas a conta estiver inativa', async () => {
            const mockUser = { status: UserStatus.DEACTIVATED } as User;
            userRepoMock.findByExternalIdpSubject.mockResolvedValue(mockUser);

            await expect(service.resolveUser('sub-123', 'test@example.com', true))
                .rejects.toThrow(ForbiddenException);
        });

        it('deve rejeitar (ConflictException) se o email existir mas sem "sub" (Account Linking)', async () => {
            userRepoMock.findByExternalIdpSubject.mockResolvedValue(null);
            userRepoMock.findByEmail.mockResolvedValue({} as User); // Simula user local com mesmo email

            await expect(service.resolveUser('sub-123', 'collision@example.com', true))
                .rejects.toThrow(ConflictException);
        });

        it('deve criar um novo utilizador e customer (JIT Provisioning)', async () => {
            userRepoMock.findByExternalIdpSubject.mockResolvedValue(null);
            userRepoMock.findByEmail.mockResolvedValue(null);
            userRepoMock.findByUsername.mockResolvedValue(null); // Username livre
            userRepoMock.insert.mockResolvedValue(undefined);
            customerRepoMock.insert.mockResolvedValue(undefined);

            const user = await service.resolveUser('sub-new', 'newuser@example.com', true);

            expect(user.status).toBe(UserStatus.ACTIVE);
            expect(user.passwordHash).toBeUndefined();
            expect(user.externalIdpSubject?.value).toBe('sub-new');
            expect(user.email.address).toBe('newuser@example.com');
            
            expect(userRepoMock.insert).toHaveBeenCalledWith(user);
            expect(customerRepoMock.insert).toHaveBeenCalledTimes(1);
        });
    });

    describe('generateExchangeCode', () => {
        it('deve guardar um código de exchange válido', async () => {
            const username = 'testuser';
            const code = await service.generateExchangeCode(username);

            expect(code).toBeDefined();
            expect(codeStoreMock.put).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ username })
            );
        });
    });

    describe('exchangeCode', () => {
        it('deve rejeitar se o código for inválido ou expirado', async () => {
            codeStoreMock.consume.mockResolvedValue(null);

            await expect(service.exchangeCode('invalid-code'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('deve emitir um JWT se o código for válido', async () => {
            codeStoreMock.consume.mockResolvedValue({ username: 'testuser', expiresAt: new Date() });
            const mockUser = {
                username: { value: 'testuser' },
                name: { firstName: 'Test', lastName: 'User' },
                email: { address: 'test@example.com' },
                roles: new Set([{ name: 'CUSTOMER' }]),
                status: UserStatus.ACTIVE,
                createdAt: { value: new Date() },
                updatedAt: { value: new Date() },
            } as unknown as User;
            
            userRepoMock.findByUsername.mockResolvedValue(mockUser);
            tokenServiceMock.generateToken.mockResolvedValue('mock-jwt-token');

            const result = await service.exchangeCode('valid-code');

            expect(result.token).toBe('mock-jwt-token');
            expect(result.user.username).toBe('testuser');
            expect(tokenServiceMock.generateToken).toHaveBeenCalledWith(mockUser);
        });
    });
});