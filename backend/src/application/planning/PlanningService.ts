import {
    BadGatewayException,
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
    ConflictException
} from '@nestjs/common';
import { PRODUCT_REPOSITORY, IProductRepository } from '../product/IProductRepository';
import { PREDEFINED_PIZZA_REPOSITORY, IPredefinedPizzaRepository } from '../pizza/IPredefinedPizzaRepository';
import { COMPONENT_SIZE_CONFIGURATION_REPOSITORY, IComponentSizeConfigurationRepository } from '../pizza/IComponentSizeConfigurationRepository';
import { IStockRepository } from '../stock/IStockRepository';
import { Sku } from '../../domain/product/Sku';
import { PROLOG_HTTP_CLIENT, PrologHttpClient } from '../../infrastructure/prolog/PrologHttpClient';
import { IPlanningResultRepository, PLANNING_RESULT_REPOSITORY, PlanningResultRecord } from './IPlanningResultRepository';
import {
    BomExecutionRequestDTO,
    PlanningExecutionRequestDTO,
    PlanningResultResponseDTO,
    PrologComponentConfigDTO,
    PrologBomDTO,
    PrologProductDTO,
    PrologRequestDTO,
    PrologResponseDTO
} from './PlanningDTOs';
import {
    ForecastInputDTO,
    SupplierScenarioInputDTO,
} from './PlanningDTOs';
import { IConsumptionForecastRepository, CONSUMPTION_FORECAST_REPOSITORY } from './IConsumptionForecastRepository';
import { ISupplierScenarioRepository, SUPPLIER_SCENARIO_REPOSITORY } from './ISupplierScenarioRepository';

@Injectable()
export class PlanningService {
    constructor(
        @Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
        @Inject(PREDEFINED_PIZZA_REPOSITORY) private readonly pizzas: IPredefinedPizzaRepository,
        @Inject(COMPONENT_SIZE_CONFIGURATION_REPOSITORY) private readonly configs: IComponentSizeConfigurationRepository,
        @Inject('IStockRepository') private readonly stock: IStockRepository,
        @Inject(PROLOG_HTTP_CLIENT) private readonly prolog: PrologHttpClient,
        @Inject(PLANNING_RESULT_REPOSITORY) private readonly results: IPlanningResultRepository,
        @Inject(CONSUMPTION_FORECAST_REPOSITORY) private readonly forecasts: IConsumptionForecastRepository,
        @Inject(SUPPLIER_SCENARIO_REPOSITORY) private readonly scenarios: ISupplierScenarioRepository,
    ) {}

    async listForecasts() {
        return this.forecasts.findAll();
    }

    async createForecast(dto: ForecastInputDTO) {
        this.validateForecastDefinition(dto);
        await this.validateForecastEntries(dto);
        if (await this.forecasts.findByName(dto.name)) {
            throw new ConflictException(`Forecast '${dto.name}' already exists`);
        }
        return this.forecasts.create({
            ...dto,
            entries: dto.entries.map((entry) => ({ ...entry, pizzaSize: entry.pizzaSize ?? null })),
            pendingDeliveries: dto.pendingDeliveries ?? [],
        });
    }

    async updateForecast(name: string, dto: Omit<ForecastInputDTO, 'name'>) {
        this.validateForecastDefinition({ ...dto, name });
        await this.validateForecastEntries({ ...dto, name });
        const updated = await this.forecasts.update(name, {
            ...dto,
            entries: dto.entries.map((entry) => ({ ...entry, pizzaSize: entry.pizzaSize ?? null })),
        });
        if (!updated) throw new NotFoundException(`Forecast '${name}' not found`);
        return updated;
    }

    async deleteForecast(name: string) {
        if (!(await this.forecasts.delete(name))) throw new NotFoundException(`Forecast '${name}' not found`);
    }

    async listScenarios() {
        return this.scenarios.findAll();
    }

    async createScenario(dto: SupplierScenarioInputDTO) {
        await this.validateScenarioDefinition(dto);
        if (await this.scenarios.findByName(dto.name)) {
            throw new ConflictException(`Scenario '${dto.name}' already exists`);
        }
        return this.scenarios.create({
            ...dto,
            confirmedAt: null,
            suppliers: dto.suppliers.map((supplier) => ({ supplierCode: supplier.supplierCode, name: supplier.name ?? '' })),
            offers: dto.offers.map((offer) => ({ ...offer, dailySupplyLimit: offer.dailySupplyLimit ?? null })),
        });
    }

    async updateScenario(name: string, dto: Omit<SupplierScenarioInputDTO, 'name'>) {
        await this.validateScenarioDefinition({ ...dto, name });
        const updated = await this.scenarios.update(name, {
            ...dto,
            suppliers: dto.suppliers.map((supplier) => ({ supplierCode: supplier.supplierCode, name: supplier.name ?? '' })),
            offers: dto.offers.map((offer) => ({ ...offer, dailySupplyLimit: offer.dailySupplyLimit ?? null })),
        });
        if (!updated) throw new NotFoundException(`Scenario '${name}' not found`);
        return updated;
    }

    async deleteScenario(name: string) {
        const scenario = await this.scenarios.findByName(name);
        if (!scenario) throw new NotFoundException(`Scenario '${name}' not found`);
        if (scenario.confirmedAt) throw new ConflictException('Confirmed scenarios cannot be deleted');
        if (!(await this.scenarios.delete(name))) throw new NotFoundException(`Scenario '${name}' not found`);
    }

    async confirmScenario(name: string) {
        const scenario = await this.scenarios.findByName(name);
        if (!scenario) throw new NotFoundException(`Scenario '${name}' not found`);
        if (scenario.confirmedAt) throw new ConflictException('Scenario is already confirmed');
        if (scenario.offers.length === 0) throw new UnprocessableEntityException('A scenario must contain at least one offer');
        return this.scenarios.confirm(name);
    }

    // =========================================================================
    // AI01: Bill of Materials
    // =========================================================================
    async executeBom(dto: BomExecutionRequestDTO): Promise<PlanningResultResponseDTO> {
        this.validateRequest(dto);

        const referenceDate = dto.referenceDate ?? new Date().toISOString().slice(0, 10);
        const isSimulated = Boolean(dto.isSimulated);

        const productMap = new Map<string, Awaited<ReturnType<IProductRepository['findBySku']>>>();
        const unknown: string[] = [];
        for (const order of dto.orders) {
            if (productMap.has(order.productSku)) continue;
            const product = await this.products.findBySku(Sku.create(order.productSku));
            if (!product) { unknown.push(order.productSku); continue; }
            productMap.set(order.productSku, product);
        }
        if (unknown.length) throw new UnprocessableEntityException(`Unknown product SKU(s): ${unknown.join(', ')}`);

        const prologProducts: PrologProductDTO[] = [];
        const prologConfigs: PrologComponentConfigDTO[] = [];
        const prologBoms: PrologBomDTO[] = [];
        const stockSnapshot: Record<string, number> = {};
        const componentSkus = new Set<string>();

        for (const order of dto.orders) {
            const product = productMap.get(order.productSku)!;
            const variants = await this.pizzas.findByProduct(Sku.create(order.productSku));
            if (variants.length === 0) {
                if (!product.flags.stockControlled || !product.flags.sellable || product.stockUnitsPerSale === null) {
                    throw new UnprocessableEntityException(`Product ${order.productSku} is not a pizza or a stock-controlled sellable product`);
                }
                if (!prologProducts.find((p) => p.sku === order.productSku)) {
                    const stockItem = await this.stock.findByProductSku(Sku.create(order.productSku));
                    const currentStock = stockItem?.currentUnits ?? 0;
                    stockSnapshot[order.productSku] = currentStock;
                    prologProducts.push({
                        sku: product.sku.value, name: product.name.value, category: product.category.value,
                        isPizzaComponent: product.flags.pizzaComponent, isStockControlled: product.flags.stockControlled,
                        isSellable: product.flags.sellable, componentTypeName: product.componentType?.value ?? null,
                        stockUnitsPerSale: product.stockUnitsPerSale, currentStock, isActive: product.active,
                    });
                }
                continue;
            }
            if (!order.pizzaSize) throw new UnprocessableEntityException(`Pizza ${order.productSku} requires a size`);
            const pizzaSize = order.pizzaSize;
            const variant = variants.find((v) => v.id.pizzaSize.value === pizzaSize);
            if (!variant) throw new UnprocessableEntityException(`Pizza ${order.productSku} has no size ${pizzaSize}`);
            const recipe = [...variant.recipe];

            if (!prologProducts.find((p) => p.sku === order.productSku)) {
                prologProducts.push({
                    sku: product!.sku.value, name: product!.name.value, category: product!.category.value,
                    isPizzaComponent: product!.flags.pizzaComponent, isStockControlled: product!.flags.stockControlled,
                    isSellable: product!.flags.sellable, componentTypeName: product!.componentType?.value ?? null,
                    stockUnitsPerSale: null, currentStock: 0, isActive: product!.active,
                });
            }

            if (!prologBoms.find((b) => b.pizzaSku === order.productSku)) {
                prologBoms.push({
                    pizzaSku: order.productSku, recipeName: variant.recipeName,
                    lines: recipe.map((l) => ({ componentSku: l.componentSku.value, defaultQuantity: l.defaultQuantity })),
                });
            }
            for (const line of recipe) componentSkus.add(line.componentSku.value);
        }

        for (const compSku of componentSkus) {
            if (!prologProducts.find((p) => p.sku === compSku)) {
                const componentProduct = await this.products.findBySku(Sku.create(compSku));
                if (!componentProduct) throw new UnprocessableEntityException(`Component ${compSku} does not exist`);
                const stockItem = await this.stock.findByProductSku(Sku.create(compSku));
                const currentStock = stockItem?.currentUnits ?? 0;
                stockSnapshot[compSku] = currentStock;
                prologProducts.push({
                    sku: compSku, name: componentProduct.name.value, category: componentProduct.category.value,
                    isPizzaComponent: componentProduct.flags.pizzaComponent, isStockControlled: componentProduct.flags.stockControlled,
                    isSellable: componentProduct.flags.sellable, componentTypeName: componentProduct.componentType?.value ?? null,
                    stockUnitsPerSale: null, currentStock, isActive: componentProduct.active,
                });
            } else if (stockSnapshot[compSku] === undefined) {
                const stockItem = await this.stock.findByProductSku(Sku.create(compSku));
                stockSnapshot[compSku] = stockItem?.currentUnits ?? 0;
            }

            const configs = await this.configs.findByProduct(Sku.create(compSku));
            for (const order of dto.orders) {
                if (!order.pizzaSize) continue;
                const pizzaSize = order.pizzaSize;
                const bom = prologBoms.find((b) => b.pizzaSku === order.productSku);
                if (!bom?.lines.some((l) => l.componentSku === compSku)) continue;
                const cfg = configs.find((c) => c.configuration.pizzaSize.value === pizzaSize);
                if (!cfg) throw new UnprocessableEntityException(`Missing size configuration for (${compSku}, ${pizzaSize})`);
                if (!prologConfigs.find((c) => c.componentSku === compSku && c.pizzaSize === pizzaSize)) {
                    prologConfigs.push({
                        componentSku: compSku, pizzaSize,
                        stockUnitsConsumed: cfg.configuration.stockUnitsConsumed.units,
                    });
                }
            }
        }

        const prologRequest: PrologRequestDTO = {
            executionType: 'BOM', referenceDate, isSimulated, orders: dto.orders,
            products: prologProducts, componentSizeConfigurations: prologConfigs, boms: prologBoms,
        };

        let prologResult: PrologResponseDTO;
        try { prologResult = await this.prolog.execute(prologRequest); }
        catch (err) { throw new BadGatewayException(`Planning engine unavailable: ${(err as Error).message}`); }

        const stockSnapshotWithTime = { capturedAt: new Date().toISOString(), quantities: stockSnapshot };

        const saved = await this.results.save({
            forecastName: null, scenarioName: dto.scenarioName ?? null, referenceDate,
            isReplay: false, isSimulated,
            forecastSnapshot: { orders: dto.orders, prologRequest },
            scenarioSnapshot: dto.scenarioName ? { scenarioName: dto.scenarioName } : 'null',
            stockSnapshot: stockSnapshotWithTime,
            requirements: prologResult.requirements, proposals: [], unmetNeeds: prologResult.unmetNeeds,
        });

        return {
            executionId: saved.executionId, forecastName: saved.forecastName, scenarioName: saved.scenarioName,
            referenceDate: saved.referenceDate, isReplay: saved.isReplay, isSimulated: saved.isSimulated,
            executedAt: saved.executedAt, requirements: saved.requirements, proposals: [], unmetNeeds: saved.unmetNeeds,
        };
    }

    // =========================================================================
    // AI02: Requirements Planning
    // =========================================================================
    async executeForecast(dto: PlanningExecutionRequestDTO): Promise<PlanningResultResponseDTO> {
        this.validateForecastRequest(dto);

        const referenceDate = dto.referenceDate ?? new Date().toISOString().slice(0, 10);

        const forecast = await this.forecasts.findByName(dto.forecastName);
        if (!forecast) throw new NotFoundException(`Forecast '${dto.forecastName}' not found`);

        // A forecast may carry seeded/default delivery assumptions; an explicit execution
        // payload takes precedence so callers can still override them.
        const pendingDeliveries = dto.pendingDeliveries ?? forecast.pendingDeliveries ?? [];
        this.validatePendingDeliveries(pendingDeliveries);

        const scenario = await this.scenarios.findByName(dto.scenarioName);
        if (!scenario) throw new NotFoundException(`Scenario '${dto.scenarioName}' not found`);
        if (!scenario.confirmedAt) throw new ConflictException('Scenario must be confirmed before execution');

        const skusToFetch = new Set<string>();
        forecast.entries.forEach(e => skusToFetch.add(e.productSku));
        for (const delivery of pendingDeliveries) skusToFetch.add(delivery.productSku);

        const prologProducts: PrologProductDTO[] = [];
        const prologBoms: PrologBomDTO[] = [];
        const prologConfigs: PrologComponentConfigDTO[] = [];
        const stockSnapshot: Record<string, number> = {};

        for (const sku of skusToFetch) {
            const product = await this.products.findBySku(Sku.create(sku));
            if (!product) throw new UnprocessableEntityException(`Unknown product SKU: ${sku}`);
            if (!product.active) throw new UnprocessableEntityException(`Product is inactive: ${sku}`);

            if (product.flags.stockControlled && product.flags.sellable && product.stockUnitsPerSale === null) {
                throw new UnprocessableEntityException(`Missing stockUnitsPerSale for SKU: ${sku}`);
            }

            const stockItem = await this.stock.findByProductSku(Sku.create(sku));
            stockSnapshot[sku] = stockItem?.currentUnits ?? 0;

            prologProducts.push({
                sku: product.sku.value, name: product.name.value, category: product.category.value,
                isPizzaComponent: product.flags.pizzaComponent, isStockControlled: product.flags.stockControlled,
                isSellable: product.flags.sellable, componentTypeName: product.componentType?.value ?? null,
                stockUnitsPerSale: product.stockUnitsPerSale ?? null,
                currentStock: stockSnapshot[sku], isActive: product.active
            });

            const variants = await this.pizzas.findByProduct(Sku.create(sku));
            if (variants.length > 0) {
                const recipe = [...variants[0].recipe];
                prologBoms.push({
                    pizzaSku: sku, recipeName: variants[0].recipeName,
                    lines: recipe.map(l => ({ componentSku: l.componentSku.value, defaultQuantity: l.defaultQuantity }))
                });

                for (const line of recipe) {
                    const compSku = line.componentSku.value;
                    if (!stockSnapshot[compSku]) {
                        const compStock = await this.stock.findByProductSku(Sku.create(compSku));
                        stockSnapshot[compSku] = compStock?.currentUnits ?? 0;

                        const compProd = await this.products.findBySku(Sku.create(compSku));
                        if (compProd && !prologProducts.find(p => p.sku === compSku)) {
                            prologProducts.push({
                                sku: compSku, name: compProd.name.value, category: compProd.category.value,
                                isPizzaComponent: compProd.flags.pizzaComponent, isStockControlled: compProd.flags.stockControlled,
                                isSellable: compProd.flags.sellable, componentTypeName: compProd.componentType?.value ?? null,
                                stockUnitsPerSale: null, currentStock: stockSnapshot[compSku], isActive: compProd.active
                            });
                        }
                    }
                    const compConfigs = await this.configs.findByProduct(Sku.create(compSku));
                    for (const config of compConfigs) {
                        if (!prologConfigs.find(c => c.componentSku === compSku && c.pizzaSize === config.configuration.pizzaSize.value)) {
                            prologConfigs.push({
                                componentSku: compSku, pizzaSize: config.configuration.pizzaSize.value,
                                stockUnitsConsumed: config.configuration.stockUnitsConsumed.units
                            });
                        }
                    }
                }
            }
        }

        const prologRequest: PrologRequestDTO = {
            executionType: 'REQUIREMENTS_PLANNING',
            referenceDate,
            forecast: {
                name: forecast.name,
                entries: forecast.entries,
                startDate: forecast.startDate,
                endDate: forecast.endDate,
            },
            scenario: { name: scenario.name, suppliers: scenario.suppliers, offers: scenario.offers },
            products: prologProducts,
            boms: prologBoms,
            componentSizeConfigurations: prologConfigs,
                pendingDeliveries,
        };

        let prologResult: PrologResponseDTO;
        try { prologResult = await this.prolog.execute(prologRequest); }
        catch (err) { throw new BadGatewayException(`Planning engine unavailable: ${(err as Error).message}`); }

        const saved = await this.results.save({
            forecastName: forecast.name, scenarioName: scenario.name, referenceDate,
            isReplay: false, isSimulated: scenario.isSimulated,
            forecastSnapshot: { ...forecast, pendingDeliveries, prologRequest },
            scenarioSnapshot: { ...scenario, pendingDeliveries },
            stockSnapshot: { capturedAt: new Date().toISOString(), quantities: stockSnapshot },
            requirements: prologResult.requirements, proposals: prologResult.proposals || [],
            unmetNeeds: prologResult.unmetNeeds
        });

        return {
            executionId: saved.executionId, forecastName: saved.forecastName, scenarioName: saved.scenarioName,
            referenceDate: saved.referenceDate, isReplay: saved.isReplay, isSimulated: saved.isSimulated,
            executedAt: saved.executedAt, requirements: saved.requirements, proposals: saved.proposals as any,
            unmetNeeds: saved.unmetNeeds,
            unmetOnTime: saved.unmetNeeds.filter((need) => need.stillUnmetQuantity !== undefined),
            lateFulfilled: saved.unmetNeeds.flatMap((need) => (need.lateFulfillments ?? []).map((row) => ({
                dueDate: need.date ?? '', fulfilledDate: row.fulfilledDate, productSku: need.productSku,
                quantity: row.quantity, lateByDays: row.lateByDays
            })))
        };
    }

    async listExecutions(filters: {
        forecastName?: string;
        scenarioName?: string;
        pageSize?: number;
        pageStartIndex?: number;
    }): Promise<PlanningResultResponseDTO[]> {
        for (const value of [filters.pageSize, filters.pageStartIndex]) {
            if (value !== undefined && (!Number.isInteger(value) || value < 0))
                throw new BadRequestException('Pagination values must be non-negative integers');
        }
        const records = await this.results.findAll(filters);
        return records.map((record) => this.toResponse(record));
    }

    async getExecution(executionId: number): Promise<PlanningResultResponseDTO> {
        const record = await this.getRecord(executionId);
        return this.toResponse(record);
    }

    async replayExecution(executionId: number): Promise<PlanningResultResponseDTO> {
        const original = await this.getRecord(executionId);
        const snapshot = original.forecastSnapshot;
        if (!snapshot || typeof snapshot !== 'object' || !('prologRequest' in snapshot)) {
            throw new UnprocessableEntityException('Execution does not contain a replayable planning snapshot');
        }

        const request = (snapshot as { prologRequest?: PrologRequestDTO }).prologRequest;
        if (!request) throw new UnprocessableEntityException('Execution does not contain a replayable planning snapshot');

        let prologResult: PrologResponseDTO;
        try {
            prologResult = await this.prolog.execute(request);
        } catch (err) {
            throw new BadGatewayException(`Planning engine unavailable: ${(err as Error).message}`);
        }

        const saved = await this.results.save({
            forecastName: original.forecastName,
            scenarioName: original.scenarioName,
            referenceDate: original.referenceDate,
            isReplay: true,
            isSimulated: original.isSimulated,
            forecastSnapshot: original.forecastSnapshot,
            scenarioSnapshot: original.scenarioSnapshot,
            stockSnapshot: original.stockSnapshot,
            requirements: prologResult.requirements,
            proposals: prologResult.proposals ?? [],
            unmetNeeds: prologResult.unmetNeeds,
        });
        return this.toResponse(saved);
    }

    private async getRecord(executionId: number) {
        if (!Number.isInteger(executionId) || executionId <= 0)
            throw new BadRequestException('executionId must be a positive integer');
        const record = await this.results.findById(executionId);
        if (!record) throw new NotFoundException(`Execution '${executionId}' not found`);
        return record;
    }

    private toResponse(record: PlanningResultRecord): PlanningResultResponseDTO {
        return {
            executionId: record.executionId,
            forecastName: record.forecastName,
            scenarioName: record.scenarioName,
            referenceDate: record.referenceDate,
            isReplay: record.isReplay,
            isSimulated: record.isSimulated,
            executedAt: record.executedAt,
            requirements: record.requirements,
            proposals: record.proposals as PlanningResultResponseDTO['proposals'],
            unmetNeeds: record.unmetNeeds,
            unmetOnTime: record.unmetNeeds.filter((need) => need.stillUnmetQuantity !== undefined),
            lateFulfilled: record.unmetNeeds.flatMap((need) => (need.lateFulfillments ?? []).map((row) => ({
                dueDate: need.date ?? '', fulfilledDate: row.fulfilledDate, productSku: need.productSku,
                quantity: row.quantity, lateByDays: row.lateByDays
            }))),
        };
    }

    private validateRequest(dto: BomExecutionRequestDTO): void {
        if (!dto || !Array.isArray(dto.orders) || dto.orders.length === 0) throw new BadRequestException('orders must be a non-empty array');
        for (const order of dto.orders) {
            if (typeof order.productSku !== 'string' || order.productSku.length === 0) throw new BadRequestException('Each order requires productSku');
            if (order.pizzaSize !== undefined && (typeof order.pizzaSize !== 'string' || order.pizzaSize.length === 0)) throw new BadRequestException('pizzaSize must be a non-empty string when provided');
            if (!Number.isInteger(order.quantity) || order.quantity <= 0) throw new BadRequestException('Each order requires a positive integer quantity');
        }
        if (typeof dto.isSimulated !== 'boolean') throw new BadRequestException('isSimulated must be a boolean');
        if (dto.source !== 'simulated' && dto.source !== 'fromForecast') throw new BadRequestException('source must be "simulated" or "fromForecast"');
    }

    private validateForecastRequest(dto: PlanningExecutionRequestDTO): void {
        if (!dto.forecastName || typeof dto.forecastName !== 'string') throw new BadRequestException('forecastName required');
        if (!dto.scenarioName || typeof dto.scenarioName !== 'string') throw new BadRequestException('scenarioName required');
        if (dto.referenceDate && !/^\d{4}-\d{2}-\d{2}$/.test(dto.referenceDate)) throw new BadRequestException('Invalid referenceDate format (YYYY-MM-DD)');
        if (dto.pendingDeliveries !== undefined && !Array.isArray(dto.pendingDeliveries))
            throw new BadRequestException('pendingDeliveries must be an array');
        this.validatePendingDeliveries(dto.pendingDeliveries ?? []);
    }

    private validatePendingDeliveries(deliveries: NonNullable<PlanningExecutionRequestDTO['pendingDeliveries']>): void {
        for (const delivery of deliveries) {
            if (!delivery || typeof delivery.productSku !== 'string' || delivery.productSku.length === 0)
                throw new BadRequestException('Each pending delivery requires productSku');
            if (!Number.isInteger(delivery.quantity) || delivery.quantity <= 0)
                throw new BadRequestException('Each pending delivery requires a positive integer quantity');
            if (typeof delivery.expectedDeliveryDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(delivery.expectedDeliveryDate))
                throw new BadRequestException('Each pending delivery requires expectedDeliveryDate in YYYY-MM-DD format');
        }
    }

    private validateForecastDefinition(dto: ForecastInputDTO): void {
            if (!dto || typeof dto.name !== 'string' || !dto.name.trim()) throw new BadRequestException('name is required');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dto.endDate))
                throw new BadRequestException('startDate and endDate must use YYYY-MM-DD');
            if (dto.startDate > dto.endDate) throw new BadRequestException('startDate must not be after endDate');
            if (!Array.isArray(dto.entries)) throw new BadRequestException('entries must be an array');
    }

    private async validateForecastEntries(dto: ForecastInputDTO): Promise<void> {
            const seen = new Set<string>();
            const errors: string[] = [];
            for (const entry of dto.entries) {
                if (!entry || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || entry.date < dto.startDate || entry.date > dto.endDate)
                    errors.push(`Entry date '${entry?.date ?? ''}' is outside the forecast period`);
                if (typeof entry.productSku !== 'string' || !entry.productSku.trim()) {
                    errors.push('Each entry requires productSku');
                    continue;
                }
                if (!Number.isInteger(entry.quantity) || entry.quantity < 0)
                    errors.push(`Invalid quantity for ${entry.productSku}`);
                const product = await this.products.findBySku(Sku.create(entry.productSku));
                if (!product || !product.flags.sellable || !product.active) {
                    errors.push(`Product '${entry.productSku}' is unknown, inactive or not sellable`);
                    continue;
                }
                const isPizza = (await this.pizzas.findByProduct(Sku.create(entry.productSku))).length > 0;
                if (isPizza && !entry.pizzaSize) errors.push(`Pizza '${entry.productSku}' requires pizzaSize`);
                if (entry.pizzaSize && !(await this.forecasts.hasPizzaSize(entry.pizzaSize)))
                    errors.push(`Unknown pizza size '${entry.pizzaSize}'`);
                if (!isPizza && entry.pizzaSize) errors.push(`Product '${entry.productSku}' cannot have pizzaSize`);
                const key = `${entry.date}|${entry.productSku}|${entry.pizzaSize ?? ''}`;
                if (seen.has(key)) errors.push(`Duplicate forecast entry '${key}'`);
                seen.add(key);
            }
            if (errors.length) throw new UnprocessableEntityException([...new Set(errors)]);
    }

    private async validateScenarioDefinition(dto: SupplierScenarioInputDTO): Promise<void> {
            if (!dto || typeof dto.name !== 'string' || !dto.name.trim()) throw new BadRequestException('name is required');
            if (!Array.isArray(dto.suppliers) || !Array.isArray(dto.offers)) throw new BadRequestException('suppliers and offers must be arrays');
            const suppliers = new Set<string>();
            for (const supplier of dto.suppliers) {
                if (!supplier?.supplierCode || suppliers.has(supplier.supplierCode)) throw new UnprocessableEntityException('Supplier codes must be unique');
                suppliers.add(supplier.supplierCode);
            }
            const offers = new Set<string>();
            for (const offer of dto.offers) {
                const key = `${offer.supplierCode}|${offer.productSku}`;
                if (!suppliers.has(offer.supplierCode) || offers.has(key))
                    throw new UnprocessableEntityException(`Invalid or duplicate offer '${key}'`);
                if (typeof offer.productSku !== 'string' || !offer.productSku.trim() ||
                    typeof offer.priceEur !== 'number' || offer.priceEur < 0 ||
                    !Number.isInteger(offer.stockUnitQuantity) || offer.stockUnitQuantity <= 0 ||
                    !Number.isInteger(offer.leadTimeDays) || offer.leadTimeDays < 0 ||
                    (offer.dailySupplyLimit !== null && offer.dailySupplyLimit !== undefined &&
                        (!Number.isInteger(offer.dailySupplyLimit) || offer.dailySupplyLimit < 0)))
                    throw new UnprocessableEntityException(`Invalid values for offer '${key}'`);
                if (!(await this.products.findBySku(Sku.create(offer.productSku))))
                    throw new UnprocessableEntityException(`Unknown product SKU '${offer.productSku}'`);
                offers.add(key);
        }
        }
}
