import * as Yup from 'yup';

/**
 * Add / edit a shop product listing.
 *
 * `product_id` is set by the catalog picker (GET /supplier/products), so the
 * only way it is missing is when nothing has been picked yet.
 */
export const productSchema = Yup.object().shape({
  product_id: Yup.number()
    .typeError('Pick a product from the catalog')
    .integer('Pick a product from the catalog')
    .positive('Pick a product from the catalog')
    .required('Pick a product from the catalog'),
  sku: Yup.string().trim().required('SKU is required'),
  price: Yup.number()
    .typeError('Price must be a number')
    .min(0, 'Price cannot be negative')
    .required('Price is required'),
  deposit_amount: Yup.number()
    .typeError('Deposit must be a number')
    .min(0, 'Deposit cannot be negative')
    .required('Deposit is required'),
  return_mode: Yup.string().required('Choose how the container comes back'),
  stock_quantity: Yup.number()
    .typeError('Stock must be a number')
    .integer('Stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .required('Stock is required'),
  low_stock_threshold: Yup.number()
    .typeError('Threshold must be a number')
    .integer('Threshold must be a whole number')
    .min(0, 'Threshold cannot be negative')
    .required('Low-stock threshold is required'),
});

export const adjustStockSchema = Yup.object().shape({
  change_quantity: Yup.number()
    .typeError('Enter a number')
    .integer('Enter a whole number')
    .notOneOf([0], 'A zero change does nothing')
    .required('Enter how much stock changed'),
  reason: Yup.string().required('Pick a reason'),
  notes: Yup.string().trim(),
});

/**
 * The adjust-stock rules for one listing — on top of the base rules, a removal
 * can't take the count below zero (the server rejects it too).
 */
export const adjustStockSchemaFor = (currentStock: number) =>
  adjustStockSchema.shape({
    change_quantity: Yup.number()
      .typeError('Enter a number')
      .integer('Enter a whole number')
      .notOneOf([0], 'A zero change does nothing')
      .test(
        'not-below-zero',
        `You only have ${currentStock} in stock`,
        value => value === undefined || currentStock + value >= 0,
      )
      .required('Enter how much stock changed'),
  });

export default productSchema;
