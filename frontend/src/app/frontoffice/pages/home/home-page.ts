import { Component } from '@angular/core';
import { OrderHero } from '../../shared_components/order-hero/order-hero';

@Component({
	selector: 'app-home-page',
	standalone: true,
	imports: [OrderHero],
	template: '<app-order-hero />',
})
export class HomePage {}
