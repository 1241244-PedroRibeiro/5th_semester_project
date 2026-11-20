import { ValueObject } from './ValueObject';
import { Result } from './Result';

interface DesignationProps {
  text: string;
}

export class Designation extends ValueObject<DesignationProps> {
  get text(): string {
    return this.props.text;
  }

  private constructor(props: DesignationProps) {
    super(props);
  }

  public static create(text: string): Result<Designation> {
    if (!text || text.trim().length === 0) {
      return Result.fail<Designation>('Designation cannot be empty');
    }

    return Result.ok<Designation>(
      new Designation({ text: text.trim() })
    );
  }
}