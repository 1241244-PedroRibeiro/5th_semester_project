import { Component } from '@angular/core';
import { Resources } from '../../shared_components/resource-management/resources';

@Component({
	selector: 'app-pizza-components-page',
	standalone: true,
	imports: [Resources],
	template: '<app-resources />',
})
export class PizzaComponentsPage {}
