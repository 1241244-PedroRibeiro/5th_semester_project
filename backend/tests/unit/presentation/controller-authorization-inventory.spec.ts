import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const controllersDirectory = join(process.cwd(), 'src/presentation/http/controllers');
const routeDecorators = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head', 'All']);
const accessPolicies = new Set(['Public', 'Roles', 'Authenticated']);

function decoratorsOf(node: ts.Node): string[] {
	return (ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : []).map(decorator => {
		const expression = decorator.expression;
		return ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)
			? expression.expression.text
			: ts.isIdentifier(expression) ? expression.text : '';
	});
}

describe('HTTP controller authorization inventory', () => {
	it('marks every route explicitly public, role-protected, or authenticated-only', () => {
		const missingPolicies: string[] = [];
		for (const filename of readdirSync(controllersDirectory).filter(name => name.endsWith('.ts'))) {
			const source = ts.createSourceFile(filename, readFileSync(join(controllersDirectory, filename), 'utf8'), ts.ScriptTarget.Latest, true);
			for (const statement of source.statements) {
				if (!ts.isClassDeclaration(statement) || !decoratorsOf(statement).includes('Controller')) continue;
				const classHasPolicy = decoratorsOf(statement).some(name => accessPolicies.has(name));
				for (const member of statement.members) {
					if (!ts.isMethodDeclaration(member)) continue;
					const methodDecorators = decoratorsOf(member);
					if (!methodDecorators.some(name => routeDecorators.has(name))) continue;
					if (!classHasPolicy && !methodDecorators.some(name => accessPolicies.has(name))) {
						const method = member.name && ts.isIdentifier(member.name) ? member.name.text : '<computed>';
						missingPolicies.push(`${filename}:${method}`);
					}
				}
			}
		}
		expect(missingPolicies).toEqual([]);
	});
});
