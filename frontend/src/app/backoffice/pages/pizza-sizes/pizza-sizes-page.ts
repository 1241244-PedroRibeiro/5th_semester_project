import { Component } from '@angular/core';
import { Resources } from '../../shared_components/resource-management/resources';

@Component({
	selector: 'app-pizza-sizes-page',
	standalone: true,
	imports: [Resources],
	template: '<app-resources />',
})
export class PizzaSizesPage {}
