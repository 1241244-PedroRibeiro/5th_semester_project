NAME = laprizza
COMPOSE = docker compose -p $(NAME) -f docker-compose.yml
SERVICE ?=
DEV_PORT ?= 4200
ROOT_CMD := $(if $(filter 0,$(shell id -u)),,sudo)

.DEFAULT_GOAL := all
.PHONY: all up dev build stop down restart logs ps db config deploy smoke-tests verify-repro check-secrets logs-archive test test-db firewall ufw-report egress-apply egress-dry-run egress-timer validate-ai-docs export-ai-report clean fclean re help shared-setup shared-perms shared-pii-check shared-auditd shared-logrotate shared-cleanup sys05-dependencies sys05-setup sys05-users sys05-pam sys05-keys sys05-logrotate sys05-timer sys05-mfa-enroll sys08-install backup restore restore-test backup-to-nas backup-to-s3 dr-drill sys08-backup sys08-restore sys08-restore-test sys08-backup-nas sys08-backup-s3 sys08-dr-drill sys08-auditd

all: ## Build and start all services in the foreground
	$(COMPOSE) up --build

up: ## Build and start services in the background (optional: SERVICE=backend)
	$(COMPOSE) up -d --build $(SERVICE)

deploy: ## Execute automated deployment pipeline with logging and validation (SYS01)
	bash ./scripts/deploy.sh

smoke-tests: ## Execute automated smoke test suite against running deployment
	bash ./scripts/smoke-tests.sh

verify-repro: ## Verify Docker build reproducibility (AC1.3)
	bash ./scripts/verify-repro.sh

check-secrets: ## Scan repository for hardcoded secrets with gitleaks (AC7.2)
	@if command -v gitleaks >/dev/null 2>&1; then gitleaks detect --redact --verbose; else echo "gitleaks not installed locally. Run via Docker or CI."; fi

logs-archive: ## Purge deployment logs older than 90 days retention window (AC3.3)
	find logs/ -maxdepth 1 -type d -name "deploy-*" -mtime +90 -exec rm -rf {} + 2>/dev/null || true

firewall: ## Apply host UFW firewall rules for DEI/VPN access (SYS02)
	bash ./scripts/firewall.sh

ufw-report: ## Generate daily UFW denied connection report (SYS02 AC3.3)
	bash ./scripts/ufw-report.sh

egress-apply: ## Apply SYS03 egress allowlist from config/allowed-endpoints.yml (requires root)
	sudo bash ./scripts/egress.sh

egress-dry-run: ## Validate and preview SYS03 egress rules without applying (requires root)
	DRY_RUN=true sudo -E bash ./scripts/egress.sh

egress-timer: ## Install and enable SYS03 DNS refresh timer (requires root)
	sudo install -o root -g root -m 0644 config/cron/laprizza-egress.service /etc/systemd/system/laprizza-egress.service
	sudo install -o root -g root -m 0644 config/cron/laprizza-egress.timer /etc/systemd/system/laprizza-egress.timer
	sudo install -o root -g root -m 0644 config/logrotate/laprizza-egress /etc/logrotate.d/laprizza-egress
	sudo systemctl daemon-reload
	sudo systemctl enable --now laprizza-egress.timer

test: ## Execute backend automated test suite (Jest)
	npm --prefix backend run test

test-db: ## Execute backend database integration test suite
	npm --prefix backend run test -- tests/integration/

dev: ## Start backend/database and Angular HTTPS with hot reload
	$(COMPOSE) up -d --wait backend
	npm --prefix frontend run dev -- --port $(DEV_PORT)

build: ## Build images without starting containers (optional: SERVICE=backend)
	$(COMPOSE) build $(SERVICE)

stop: ## Stop services while keeping containers and database data
	$(COMPOSE) stop $(SERVICE)

down: ## Remove containers and networks while keeping images and database data
	$(COMPOSE) down

restart: ## Restart existing containers (optional: SERVICE=backend)
	$(COMPOSE) restart $(SERVICE)

logs: ## Follow the last 100 log lines (optional: SERVICE=frontend, backend or postgres)
	$(COMPOSE) logs --follow --tail=100 $(SERVICE)

ps: ## Show service status
	$(COMPOSE) ps -a

db: ## Open PostgreSQL prompt (list tables: \dt; exit: \q)
	$(COMPOSE) exec postgres sh -c 'exec psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

config: ## Validate and display the resolved Compose configuration
	$(COMPOSE) config

validate-ai-docs: ## Validate AI03 and AI04 documentation, examples and dataset
	python docs/ai/datasets/generate.py --check

export-ai-report: ## Export the AI04 Markdown report to PDF with pandoc
	pandoc docs/ai/iarti-report.md -o docs/ai/iarti-report.pdf

clean: ## Remove containers, networks and service images; keep database data
	$(COMPOSE) down --rmi all --remove-orphans

fclean: ## Full reset: also DELETE database volumes and all stored data
	$(COMPOSE) down --volumes --rmi all --remove-orphans

re: ## Delete database data and images, then rebuild and start in the foreground
	$(MAKE) fclean
	$(MAKE) all

help: ## List available commands
	@awk 'BEGIN {FS = ":.*## "; print "Usage: make [target] [NAME=laprizza] [SERVICE=frontend|backend|postgres]\n"} /^[a-zA-Z_-]+:.*## / {printf "  %-12s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# =========================================================================
# SYS04 Shared Folder Management
# =========================================================================

shared-setup: ## Create shared folder directory structure and set permissions (SYS04)
	sudo mkdir -p /var/lib/laprizza/shared/documents/reports /var/lib/laprizza/shared/documents/operations /var/lib/laprizza/shared/3d-assets/models /var/lib/laprizza/shared/3d-assets/textures /var/lib/laprizza/shared/3d-assets/env /var/lib/laprizza/shared/kitchen-schemas /var/lib/laprizza/shared/planning-inputs /var/lib/laprizza/shared/planning-outputs /var/lib/laprizza/shared/exports /var/lib/laprizza/shared/tmp /var/lib/laprizza/shared/logs/shared-access
	sudo chown -R 1000:1000 /var/lib/laprizza/shared
	sudo chmod 0750 /var/lib/laprizza/shared /var/lib/laprizza/shared/logs /var/lib/laprizza/shared/logs/shared-access
	sudo chmod 0755 /var/lib/laprizza/shared/3d-assets /var/lib/laprizza/shared/kitchen-schemas /var/lib/laprizza/shared/exports
	sudo chmod 0750 /var/lib/laprizza/shared/planning-inputs /var/lib/laprizza/shared/planning-outputs /var/lib/laprizza/shared/documents
	sudo chmod 1777 /var/lib/laprizza/shared/tmp
	sudo setfacl -R -m g:sgri:rwX /var/lib/laprizza/shared/3d-assets 2>/dev/null || true
	sudo setfacl -R -d -m g:sgri:rwX /var/lib/laprizza/shared/3d-assets 2>/dev/null || true

shared-perms: ## Verify shared folder POSIX modes and ACLs (SYS04 AC2.1)
	@echo "=== Shared Folder Permissions ===" && find /var/lib/laprizza/shared -maxdepth 2 -type d -printf '%m %u:%g %p\n' | sort
	@echo "" && echo "=== ACLs on 3d-assets ===" && getfacl -R /var/lib/laprizza/shared/3d-assets 2>/dev/null | head -30
	@echo "" && echo "=== Sticky bit on tmp ===" && stat -c '%a %n' /var/lib/laprizza/shared/tmp

shared-pii-check: ## Run PII grep check on shared documents (SYS04 AC3.2)
	bash ./scripts/pii-check.sh logs/deploy-$$(date -u +%Y%m%dT%H%M%SZ)/pii-check.txt

shared-auditd: ## Install auditd watch rule for shared documents (SYS04 AC2.4)
	sudo cp config/audit/laprizza-shared.rules /etc/audit/rules.d/laprizza-shared.rules
	sudo auditctl -R /etc/audit/rules.d/laprizza-shared.rules

shared-logrotate: ## Install logrotate config for shared-access logs (SYS04 AC2.3)
	sudo cp config/logrotate/laprizza-shared-access /etc/logrotate.d/laprizza-shared-access

shared-cleanup: ## Install SYS04 shared-folder retention policy
	sudo install -o root -g root -m 0644 config/cron/laprizza-shared-cleanup /etc/cron.d/laprizza-shared-cleanup

# =========================================================================
# SYS05 Controlled Linux Remote Shell Access
# =========================================================================

sys05-dependencies: ## Install SYS05 host dependencies
	sudo apt-get update
	sudo apt-get install -y openssh-server libpam-google-authenticator msmtp python3

sys05-setup: sys05-users ## Create SYS05 directory structure and set permissions
	sudo mkdir -p /var/lib/laprizza/mfa /var/log/laprizza
	sudo chown -R root:laprizza /var/lib/laprizza /var/log/laprizza
	sudo chmod 0750 /var/lib/laprizza /var/log/laprizza
	sudo chmod 0700 /var/lib/laprizza/mfa
	printf '{}\n' | sudo tee /var/lib/laprizza/ssh-failures.json >/dev/null
	sudo chown root:laprizza /var/lib/laprizza/ssh-failures.json
	sudo chmod 0640 /var/lib/laprizza/ssh-failures.json

sys05-users: ## Create individual SYS05 admin accounts and lock the legacy shared account
	sudo groupadd --system laprizza 2>/dev/null || true
	sudo id -u laprizza-admin-eduardo >/dev/null 2>&1 || sudo useradd --create-home --shell /bin/bash --groups laprizza laprizza-admin-eduardo
	sudo id -u laprizza-admin-pedro >/dev/null 2>&1 || sudo useradd --create-home --shell /bin/bash --groups laprizza laprizza-admin-pedro
	sudo id -u laprizza-admin-mota >/dev/null 2>&1 || sudo useradd --create-home --shell /bin/bash --groups laprizza laprizza-admin-mota
	sudo id -u laprizza-admin-gustavo >/dev/null 2>&1 || sudo useradd --create-home --shell /bin/bash --groups laprizza laprizza-admin-gustavo
	sudo passwd --lock laprizza-admin >/dev/null 2>&1 || true

sys05-pam: sys05-dependencies sys05-setup ## Install PAM and SSH configuration files (requires root)
	sudo cp config/pam/time.conf /etc/security/time.conf
	sudo cp config/pam/sshd /etc/pam.d/sshd
	sudo cp config/pam/sshd-mfa /etc/pam.d/sshd-mfa
	sudo cp config/ssh/sshd_config /etc/ssh/sshd_config
	sudo cp scripts/laprizza-ssh-failure-hook /usr/local/sbin/
	sudo cp scripts/laprizza-ssh-failure-monitor /usr/local/sbin/
	sudo cp scripts/laprizza-ssh-audit-start /usr/local/sbin/
	sudo cp scripts/laprizza-ssh-audit-end /usr/local/sbin/
	sudo chmod 755 /usr/local/sbin/laprizza-ssh-failure-hook /usr/local/sbin/laprizza-ssh-failure-monitor /usr/local/sbin/laprizza-ssh-audit-start /usr/local/sbin/laprizza-ssh-audit-end
	sudo cp config/systemd/laprizza-ssh-failure-monitor.service /etc/systemd/system/
	sudo install -D -m 0644 config/systemd/journald-laprizza-ssh.conf /etc/systemd/journald.conf.d/laprizza-ssh.conf
	sudo systemctl daemon-reload
	sudo systemctl restart systemd-journald
	sudo systemctl enable --now laprizza-ssh-failure-monitor.service
	sudo sshd -t -f /etc/ssh/sshd_config
	sudo systemctl reload ssh

sys05-keys: ## Deploy admin SSH authorized_keys (requires root, keys from vault)
	@[ -z "$$ADMIN_EDUARDO_KEY" ] && echo "Set ADMIN_EDUARDO_KEY" && exit 1
	@[ -z "$$ADMIN_PEDRO_KEY" ] && echo "Set ADMIN_PEDRO_KEY" && exit 1
	@[ -z "$$ADMIN_MOTA_KEY" ] && echo "Set ADMIN_MOTA_KEY" && exit 1
	@[ -z "$$ADMIN_GUSTAVO_KEY" ] && echo "Set ADMIN_GUSTAVO_KEY" && exit 1
	sudo mkdir -p /home/laprizza-admin-eduardo/.ssh /home/laprizza-admin-pedro/.ssh /home/laprizza-admin-mota/.ssh /home/laprizza-admin-gustavo/.ssh
	sudo chmod 700 /home/laprizza-admin-eduardo/.ssh /home/laprizza-admin-pedro/.ssh /home/laprizza-admin-mota/.ssh /home/laprizza-admin-gustavo/.ssh
	echo "$$ADMIN_EDUARDO_KEY" | sudo tee /home/laprizza-admin-eduardo/.ssh/authorized_keys >/dev/null
	echo "$$ADMIN_PEDRO_KEY" | sudo tee /home/laprizza-admin-pedro/.ssh/authorized_keys >/dev/null
	echo "$$ADMIN_MOTA_KEY" | sudo tee /home/laprizza-admin-mota/.ssh/authorized_keys >/dev/null
	echo "$$ADMIN_GUSTAVO_KEY" | sudo tee /home/laprizza-admin-gustavo/.ssh/authorized_keys >/dev/null
	sudo chmod 600 /home/laprizza-admin-eduardo/.ssh/authorized_keys /home/laprizza-admin-pedro/.ssh/authorized_keys /home/laprizza-admin-mota/.ssh/authorized_keys /home/laprizza-admin-gustavo/.ssh/authorized_keys
	sudo chown -R laprizza-admin-eduardo:laprizza-admin-eduardo /home/laprizza-admin-eduardo/.ssh
	sudo chown -R laprizza-admin-pedro:laprizza-admin-pedro /home/laprizza-admin-pedro/.ssh
	sudo chown -R laprizza-admin-mota:laprizza-admin-mota /home/laprizza-admin-mota/.ssh
	sudo chown -R laprizza-admin-gustavo:laprizza-admin-gustavo /home/laprizza-admin-gustavo/.ssh

sys05-logrotate: ## Install logrotate config for SSH logs (SYS05 AC5)
	sudo cp config/logrotate/laprizza-ssh /etc/logrotate.d/laprizza-ssh

sys05-timer: ## Install and enable SYS05 time guard systemd timer (SYS05 AC1.4)
	sudo cp config/systemd/laprizza-ssh-time-guard.{service,timer} /etc/systemd/system/
	sudo systemctl daemon-reload
	sudo systemctl enable --now laprizza-ssh-time-guard.timer

sys05-mfa-enroll: ## Enroll admin users in TOTP MFA (run as each admin user)
	sudo -u laprizza-admin-eduardo google-authenticator -t -d -f -r 3 -R 30 -w 3
	sudo -u laprizza-admin-pedro google-authenticator -t -d -f -r 3 -R 30 -w 3
	sudo -u laprizza-admin-mota google-authenticator -t -d -f -r 3 -R 30 -w 3
	sudo -u laprizza-admin-gustavo google-authenticator -t -d -f -r 3 -R 30 -w 3

# =========================================================================
# SYS08 Backup Strategy and Recovery Validation
# =========================================================================

sys08-install: ## Install backup scripts and configs once (requires root)
	$(ROOT_CMD) mkdir -p /backups /etc/laprizza
	$(ROOT_CMD) chmod 700 /backups
	$(ROOT_CMD) cp scripts/backup.sh scripts/restore.sh scripts/restore-test.sh /usr/local/sbin/
	$(ROOT_CMD) cp scripts/backup-to-nas.sh scripts/backup-to-s3.sh scripts/dr-drill.sh scripts/smoke-tests.sh /usr/local/sbin/
	$(ROOT_CMD) chmod 755 /usr/local/sbin/backup.sh /usr/local/sbin/restore.sh /usr/local/sbin/restore-test.sh /usr/local/sbin/backup-to-nas.sh /usr/local/sbin/backup-to-s3.sh /usr/local/sbin/dr-drill.sh /usr/local/sbin/smoke-tests.sh
	$(ROOT_CMD) cp config/cron/laprizza-backup /etc/cron.d/laprizza-backup
	$(ROOT_CMD) cp config/audit/laprizza-backups.rules /etc/audit/rules.d/laprizza-backups.rules
	$(ROOT_CMD) sh -c 'auditctl -l | grep -Fq -- "-k backups" || auditctl -R /etc/audit/rules.d/laprizza-backups.rules'
	@echo "SYS08 installed. Configure age keys, NAS SSH, S3 rclone before first run."

sys08-backup: ## Create encrypted database backup (SYS08 AC2.1)
	$(ROOT_CMD) /usr/local/sbin/backup.sh daily

backup: sys08-backup ## Compatibility alias used by SYS07/SYS08 procedures

sys08-restore: ## Restore database from latest backup (SYS08 AC2.2)
	$(ROOT_CMD) /usr/local/sbin/restore.sh

restore: sys08-restore ## Compatibility alias used by SYS07/SYS08 procedures

sys08-restore-test: ## Run restore test validation (SYS08 AC3.1)
	$(ROOT_CMD) /usr/local/sbin/restore-test.sh

restore-test: sys08-restore-test ## Compatibility alias used by SYS07/SYS08 procedures

sys08-backup-nas: ## Sync backups to NAS (SYS08 AC2.4)
	$(ROOT_CMD) /usr/local/sbin/backup-to-nas.sh

backup-to-nas: sys08-backup-nas ## Compatibility alias used by SYS08 procedures

sys08-backup-s3: ## Sync backups to S3 with re-encryption (SYS08 AC2.4)
	$(ROOT_CMD) /usr/local/sbin/backup-to-s3.sh

backup-to-s3: sys08-backup-s3 ## Compatibility alias used by SYS08 procedures

sys08-dr-drill: ## Run monthly disaster recovery drill (SYS08 AC3.4, SYS07)
	$(ROOT_CMD) /usr/local/sbin/dr-drill.sh

dr-drill: sys08-dr-drill ## Compatibility alias used by SYS07 procedures

sys08-auditd: ## Install auditd rule for backup access logging (SYS08 AC4.6)
	$(ROOT_CMD) cp config/audit/laprizza-backups.rules /etc/audit/rules.d/laprizza-backups.rules
	$(ROOT_CMD) auditctl -R /etc/audit/rules.d/laprizza-backups.rules
