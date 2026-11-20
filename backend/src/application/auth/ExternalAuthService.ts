import { Injectable, Inject, UnauthorizedException, ConflictException, ForbiddenException, GoneException, NotFoundException, Optional } from '@nestjs/common';
import { IUserRepository } from './IUserRepository';
import { ITokenService } from './ISecurityServices';
import { USER_REPOSITORY, TOKEN_SERVICE, AuthFailure } from './AuthDTOs';
import { IExchangeCodeStore, EXCHANGE_CODE_STORE } from './IExchangeCodeStore';
import { ICustomerRepository, CUSTOMER_REPOSITORY } from '../customer/ICustomerRepository';
import { User } from '../../domain/user/User';
import { Customer } from '../../domain/customer/Customer';
import { Email } from '../../domain/common/Email';
import { PersonName } from '../../domain/common/PersonName';
import { Username } from '../../domain/user/Username';
import { RoleName } from '../../domain/user/RoleName';
import { UserStatus } from '../../domain/user/UserStatus';
import { Timestamp } from '../../domain/common/Timestamp';
import { ExternalIdpSubject } from '../../domain/user/ExternalIdpSubject';
import { UserRole } from '../user/UserRoles';
import { CustomerId } from '../../domain/customer/CustomerId';
import { ContactInformation } from '../../domain/customer/ContactInformation';
import { PhoneNumber } from '../../domain/customer/PhoneNumber';
import { ConsentPreferences } from '../../domain/customer/ConsentPreferences';
import { randomUUID } from 'node:crypto';
import { ACTIVATION_INVITATION_REPOSITORY, IActivationInvitationRepository } from './IActivationInvitationRepository';

@Injectable()
export class ExternalAuthService {
	constructor(
		@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
		@Inject(CUSTOMER_REPOSITORY) private readonly customerRepo: ICustomerRepository,
		@Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
		@Inject(EXCHANGE_CODE_STORE) private readonly codeStore: IExchangeCodeStore,
		@Optional() @Inject(ACTIVATION_INVITATION_REPOSITORY) private readonly invitations?: IActivationInvitationRepository,
	) {}

	async resolveUser(sub: string, emailStr: string, emailVerified: boolean): Promise<User> {
		if (!emailVerified) throw new ForbiddenException('External email not verified.');
		
		const subject = ExternalIdpSubject.create(sub);
		const email = Email.create(emailStr).getValue();

		const existingExternal = await this.userRepo.findByExternalIdpSubject(subject);
		if (existingExternal) {
			if (existingExternal.status !== UserStatus.ACTIVE)
				throw new ForbiddenException(AuthFailure.AccountDeactivated);
			return existingExternal;
		}

		const existingLocal = await this.userRepo.findByEmail(email);
		if (existingLocal)
			throw new ConflictException('account_linking_required');

		const [localPart] = email.address.split('@');
		let usernameStr = localPart;
		let suffix = 1;
		while (await this.userRepo.findByUsername(Username.create(usernameStr))) {
			usernameStr = `${localPart}${++suffix}`;
		}

		const name = PersonName.create('External', 'User');
		const now = Timestamp.create(new Date());

		const user = User.create({
			username: Username.create(usernameStr),
			name,
			email,
			externalIdpSubject: subject,
			status: UserStatus.ACTIVE,
			roles: new Set([RoleName.create(UserRole.CUSTOMER)]),
			dietaryRestrictions: new Set(),
			createdAt: now,
			updatedAt: now,
		});

		await this.userRepo.insert(user);

		const customer = Customer.create({
			id: CustomerId.create(randomUUID()),
			username: user.username,
			name,
			contactInfo: new ContactInformation(PhoneNumber.create('+351000000000'), email),
			consent: new ConsentPreferences(false, now),
			addresses: [],
			createdAt: now,
			updatedAt: now,
		});
		await this.customerRepo.insert(customer);

		return user;
	}

	async resolveActivation(token: string, sub: string, emailStr: string, emailVerified: boolean): Promise<User> {
		if (!emailVerified) throw new ForbiddenException('External email not verified.');
		if (!this.invitations) throw new NotFoundException('Invitation not found.');
		const invitation = await this.invitations.findByToken(token);
		if (!invitation || invitation.purpose !== 'EXTERNAL_IDP_MATCH') throw new NotFoundException('Invitation not found.');
		if (invitation.usedAt || invitation.revokedAt || invitation.expiresAt.getTime() <= Date.now())
			throw new GoneException('Invitation is expired, revoked or already used.');
		const user = await this.userRepo.findByUsername(Username.create(invitation.username));
		if (!user) throw new NotFoundException('Invitation not found.');
		if (user.email.address.toLowerCase() !== emailStr.toLowerCase())
			throw new ConflictException('invitation_identity_mismatch');
		if (user.externalIdpSubject && user.externalIdpSubject.value !== sub)
			throw new ConflictException('idp_subject_mismatch');
		await this.invitations.activateExternal(token, user.username.value, sub);
		user.linkExternalIdp(ExternalIdpSubject.create(sub));
		user.activate();
		return user;
	}

	async generateExchangeCode(username: string): Promise<string> {
		const code = randomUUID();
		await this.codeStore.put(code, { username, expiresAt: new Date(Date.now() + 60 * 1000) });
		return code;
	}

	async exchangeCode(code: string): Promise<{ token: string; user: any }> {
		const entry = await this.codeStore.consume(code);
		if (!entry) throw new UnauthorizedException('Invalid or expired exchange code.');

		const user = await this.userRepo.findByUsername(Username.create(entry.username));
		if (!user) throw new UnauthorizedException('User not found.');

		const session = this.tokenService.generateSession
			? await this.tokenService.generateSession(user)
			: { token: await this.tokenService.generateToken(user) };
		return {
			...session,
			user: {
				username: user.username.value,
				firstName: user.name.firstName,
				lastName: user.name.lastName,
				email: user.email.address,
				roles: [...user.roles].map(r => r.name),
				status: user.status,
				createdAt: user.createdAt.value.toISOString(),
				updatedAt: user.updatedAt.value.toISOString(),
			}
		};
	}
}