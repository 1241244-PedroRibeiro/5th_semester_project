import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['src/**/*.ts', 'tests/**/*.ts'],
		rules: {
			'no-undef': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],
		},
	},
);
