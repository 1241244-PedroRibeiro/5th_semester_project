
export interface KitchenConfigurationRecord {
    id: string;
    name: string;
    json_content: Record<string, unknown>;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CreateKitchenConfigurationInput {
    name: string;
    json_content: Record<string, unknown>;
}

export interface UpdateKitchenConfigurationInput {
    id: string;
    name: string;
    json_content: Record<string, unknown>;
}

export interface IKitchenConfigurationRepository {

    findAll(): Promise<KitchenConfigurationRecord[]>;

    findById(id: string): Promise<KitchenConfigurationRecord | null>;

    findByName(name: string): Promise<KitchenConfigurationRecord | null>;

    findActive(): Promise<KitchenConfigurationRecord | null>;

    create(
        input: CreateKitchenConfigurationInput
    ): Promise<KitchenConfigurationRecord>;

    update(
        input: UpdateKitchenConfigurationInput
    ): Promise<KitchenConfigurationRecord | null>;

    delete(id: string): Promise<boolean>;

    activate(id: string): Promise<KitchenConfigurationRecord | null>;
}
