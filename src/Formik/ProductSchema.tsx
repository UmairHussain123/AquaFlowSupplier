import * as Yup from 'yup';

/**
 * Add / edit a shop product listing.
 *
 * `product_id` is a raw number because the supplier API exposes no catalog
 * browse endpoint — /admin/products, /admin/categories and /admin/brands are
 * admin-only, so there is nothing to pick from.
 */
export const productSchema = Yup.object().shape({
  product_id: Yup.number()
    .typeError('Catalog product id must be a number')
    .integer('Catalog product id must be a whole number')
    .positive('Catalog product id must be positive')
    .required('Catalog product id is required'),
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

export default productSchema;
