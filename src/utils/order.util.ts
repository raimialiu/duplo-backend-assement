import { customAlphabet } from 'nanoid';

/**
 * Generates a unique order number with the following format:
 * DPL-YYYYMMDD-XXXXX
 * Where:
 * - DPL: Prefix for Duplo
 * - YYYYMMDD: Current date
 * - XXXXX: Random 5-character alphanumeric string
 */
export const generateOrderNumber = (): string => {
  // Create a custom nanoid with only uppercase letters and numbers
  const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 5);
  
  // Get current date in YYYYMMDD format
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}${month}${day}`;
  
  // Generate the random part
  const randomPart = nanoid();
  
  // Combine all parts
  return `DPL-${dateString}-${randomPart}`;
};

/**
 * Validates an order number format
 * @param orderNumber - The order number to validate
 * @returns boolean indicating if the order number is valid
 */
export const isValidOrderNumber = (orderNumber: string): boolean => {
  const orderNumberRegex = /^DPL-\d{8}-[0-9A-Z]{5}$/;
  return orderNumberRegex.test(orderNumber);
};

/**
 * Extracts the date from an order number
 * @param orderNumber - The order number to extract date from
 * @returns Date object or null if invalid
 */
export const getOrderDate = (orderNumber: string): Date | null => {
  if (!isValidOrderNumber(orderNumber)) {
    return null;
  }

  const dateString = orderNumber.split('-')[1];
  const year = parseInt(dateString.substring(0, 4));
  const month = parseInt(dateString.substring(4, 6)) - 1; // JS months are 0-based
  const day = parseInt(dateString.substring(6, 8));

  return new Date(year, month, day);
};

/**
 * Generates a batch of unique order numbers
 * Useful for bulk order creation
 * @param count - Number of order numbers to generate
 * @returns Array of unique order numbers
 */
export const generateBatchOrderNumbers = (count: number): string[] => {
  const numbers = new Set<string>();
  
  while (numbers.size < count) {
    numbers.add(generateOrderNumber());
  }
  
  return Array.from(numbers);
};