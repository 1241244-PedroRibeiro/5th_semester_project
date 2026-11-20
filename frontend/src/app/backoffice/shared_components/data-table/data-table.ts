import { TranslatePipe } from '@ngx-translate/core';
import { Component, contentChild, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
export interface Column {
	key: string;
	label: string;
}
export interface TableCellContext<T> {
	$implicit: T;
	column: string;
}
@Component({
	selector: 'app-data-table',
	standalone: true,
	imports: [TranslatePipe, NgTemplateOutlet],
	templateUrl: './data-table.html',
	styleUrl: './data-table.scss',
})
export class DataTable<T extends object> {
	readonly columns = input.required<Column[]>();
	readonly rows = input.required<T[]>();
	readonly trackKey = input('name');
	readonly label = input('Results');
	readonly cell = contentChild.required<TemplateRef<TableCellContext<T>>>(TemplateRef);
	identity(row: T): unknown {
		return Reflect.get(row, this.trackKey());
	}
}
