export const validatePromotionForm = (form) => {
  const errors = {};

  if (!form.name?.trim()) {
    errors.name = 'Promotion name is required';
  } else if (form.name.length > 255) {
    errors.name = 'Name must be 255 characters or less';
  }

  if (!form.promotion_type) {
    errors.promotion_type = 'Promotion type is required';
  }

  if (form.discount_value === '' || form.discount_value === undefined || form.discount_value === null) {
    errors.discount_value = 'Discount value is required';
  } else if (Number(form.discount_value) <= 0) {
    errors.discount_value = 'Discount value must be greater than 0';
  } else if (form.promotion_type === 'PERCENTAGE' && Number(form.discount_value) > 100) {
    errors.discount_value = 'Percentage discount cannot exceed 100';
  }

  if (!form.start_date) {
    errors.start_date = 'Start date is required';
  }

  if (!form.end_date) {
    errors.end_date = 'End date is required';
  } else if (form.start_date && new Date(form.end_date) <= new Date(form.start_date)) {
    errors.end_date = 'End date must be after start date';
  }

  if (form.minimum_order_amount !== '' && Number(form.minimum_order_amount) < 0) {
    errors.minimum_order_amount = 'Minimum order amount cannot be negative';
  }

  if (form.maximum_discount_amount !== '' && form.maximum_discount_amount !== null && Number(form.maximum_discount_amount) < 0) {
    errors.maximum_discount_amount = 'Maximum discount amount cannot be negative';
  }

  if (form.priority !== '' && Number(form.priority) < 0) {
    errors.priority = 'Priority cannot be negative';
  }

  return errors;
};
