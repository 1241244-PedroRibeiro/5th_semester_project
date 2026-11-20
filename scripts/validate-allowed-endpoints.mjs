#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import Ajv from '../backend/node_modules/ajv/dist/ajv.js';
import addFormats from '../backend/node_modules/ajv-formats/dist/index.js';

const configPath = process.argv[2];
const schemaPath = process.argv[3];

if (!configPath || !schemaPath) {
	console.error('Usage: validate-allowed-endpoints.mjs <config.json> <schema.json>');
	process.exit(2);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const validate = ajv.compile(schema);

if (!validate(config)) {
	for (const error of validate.errors || []) {
		console.error(`${error.instancePath || '/'} ${error.message}`);
	}
	process.exit(1);
}

const names = config.endpoints.map((endpoint) => endpoint.name);
const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
if (duplicateNames.length > 0) {
	console.error(`duplicate endpoint name: ${[...new Set(duplicateNames)].join(', ')}`);
	process.exit(1);
}
