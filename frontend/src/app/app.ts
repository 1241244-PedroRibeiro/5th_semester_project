import { LanguageSwitcher } from './shared_components/ui/language-switcher/language-switcher';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [LanguageSwitcher, RouterOutlet],
	templateUrl: './app.html',
	styleUrl: './app.scss',
})
export class App {}
