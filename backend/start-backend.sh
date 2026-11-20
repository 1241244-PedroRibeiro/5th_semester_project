#!/bin/sh
set -eu

npm run migration:run:prod

# Seed is idempotent: existing data is retained, fixtures are only created when missing.
npm run seed:prod

exec node dist/index.js