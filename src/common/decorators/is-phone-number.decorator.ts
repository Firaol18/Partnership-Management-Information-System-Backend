import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isPhoneNumber', async: false })
export class IsPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phoneNumber: string, args: ValidationArguments) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return false;
    }

    // Remove all non-digit characters except +
    let normalizedNumber = phoneNumber.replace(/[^\d+]/g, '');

    // Check if the number starts with valid Ethiopian prefixes
    if (
      !normalizedNumber.startsWith('251') &&
      !normalizedNumber.startsWith('+251') &&
      !normalizedNumber.startsWith('09') &&
      !normalizedNumber.startsWith('9') &&
      !normalizedNumber.startsWith('07') &&
      !normalizedNumber.startsWith('7')
    ) {
      return false;
    }

    // Remove the country code if present
    if (normalizedNumber.startsWith('251')) {
      normalizedNumber = normalizedNumber.slice(3);
    } else if (normalizedNumber.startsWith('+251')) {
      normalizedNumber = normalizedNumber.slice(4);
    }

    // Remove leading zero if present
    if (normalizedNumber.startsWith('0')) {
      normalizedNumber = normalizedNumber.slice(1);
    }

    // Ensure the final number is 9 digits long
    return normalizedNumber.length === 9;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Phone number must be a valid Ethiopian phone number (e.g., +251912345678, 0912345678, or 912345678)';
  }
}

export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPhoneNumberConstraint,
    });
  };
}

/**
 * Normalizes Ethiopian phone numbers to +251 format
 * @param phoneNumber - The phone number to normalize
 * @returns Normalized phone number with +251 prefix
 */
export function normalizeEthiopianPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return phoneNumber;
  }

  // Remove all non-digit characters except +
  let normalizedNumber = phoneNumber.replace(/[^\d+]/g, '');

  // Check if the number starts with valid Ethiopian prefixes
  if (
    !normalizedNumber.startsWith('251') &&
    !normalizedNumber.startsWith('+251') &&
    !normalizedNumber.startsWith('09') &&
    !normalizedNumber.startsWith('9') &&
    !normalizedNumber.startsWith('07') &&
    !normalizedNumber.startsWith('7')
  ) {
    throw new Error('Invalid Ethiopian phone number format');
  }

  // Remove the country code if present
  if (normalizedNumber.startsWith('251')) {
    normalizedNumber = normalizedNumber.slice(3);
  } else if (normalizedNumber.startsWith('+251')) {
    normalizedNumber = normalizedNumber.slice(4);
  }

  // Remove leading zero if present
  if (normalizedNumber.startsWith('0')) {
    normalizedNumber = normalizedNumber.slice(1);
  }

  // Ensure the final number is 9 digits long
  if (normalizedNumber.length !== 9) {
    throw new Error('Invalid phone number length');
  }

  return '+251' + normalizedNumber;
}
