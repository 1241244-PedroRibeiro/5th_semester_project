export interface CreateAllergenDTO { name: string; description?: string; }
export interface UpdateAllergenDTO { name: string; description?: string; }
export interface AllergenResponseDTO { name: string; description: string; }
export interface UserAllergensDTO { username: string; allergens: string[]; }
export interface RelateAllergenUserDTO { allergens: string[]; }
