import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AdminProductForm from '../AdminProductForm';

const createProduct = vi.fn();
const updateProduct = vi.fn();
const getProduct = vi.fn();
const getCategories = vi.fn();

vi.mock('../../../services/adminApi', () => ({
  adminAPI: {
    getCategories: (opts) => getCategories(opts),
    getProduct: (id) => getProduct(id),
    createProduct: (payload) => createProduct(payload),
    updateProduct: (id, payload) => updateProduct(id, payload),
    createVariant: vi.fn().mockResolvedValue({ data: {} }),
    updateVariant: vi.fn().mockResolvedValue({ data: {} }),
    deleteVariant: vi.fn().mockResolvedValue({ data: {} }),
    uploadProductImage: vi.fn().mockResolvedValue({ data: {} }),
    deleteProductImage: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

const baseProduct = {
  id: 5,
  name: 'Kids Cotton T-Shirt',
  category_id: 2,
  description: 'Soft cotton t-shirt for kids',
  short_description: '',
  price: '599',
  discount_price: null,
  quantity: '10',
  sku: 'TS-001',
  hsn_code: '',
  gst_rate: null,
  is_featured: false,
  is_active: true,
  meta_title: '',
  meta_description: '',
  meta_keywords: '',
  images: [],
  variants: [],
};

const categories = [{ id: 2, name: 'T-Shirts', parent_id: null }];

const byName = (name) => document.querySelector(`input[name="${name}"]`);

const renderEdit = () =>
  render(
    <MemoryRouter initialEntries={['/admin/products/5/edit']}>
      <Routes>
        <Route path="/admin/products/:id/edit" element={<AdminProductForm />} />
      </Routes>
    </MemoryRouter>
  );

const renderCreate = () =>
  render(
    <MemoryRouter initialEntries={['/admin/products/new']}>
      <Routes>
        <Route path="/admin/products/new" element={<AdminProductForm />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  getCategories.mockResolvedValue({ data: categories });
  getProduct.mockResolvedValue({ data: { ...baseProduct } });
  createProduct.mockResolvedValue({ data: { id: 99 } });
  updateProduct.mockResolvedValue({ data: {} });
});

describe('AdminProductForm - HSN Code & GST Rate', () => {
  it('renders HSN Code and GST Rate inputs with correct constraints (create mode)', async () => {
    renderCreate();
    const hsn = await screen.findByPlaceholderText('Max 8 characters');
    expect(hsn).toBeInTheDocument();
    expect(hsn).toHaveAttribute('maxlength', '8');

    const gst = screen.getByPlaceholderText('0 to 100');
    expect(gst).toHaveAttribute('type', 'number');
    expect(gst).toHaveAttribute('min', '0');
    expect(gst).toHaveAttribute('max', '100');
    expect(gst).toHaveAttribute('step', '0.01');
  });

  it('loads existing hsn_code and gst_rate values (edit mode)', async () => {
    getProduct.mockResolvedValue({
      data: { ...baseProduct, hsn_code: '6109', gst_rate: 5 },
    });
    renderEdit();
    const hsn = await screen.findByPlaceholderText('Max 8 characters');
    expect(hsn.value).toBe('6109');
    const gst = screen.getByPlaceholderText('0 to 100');
    expect(gst.value).toBe('5');
  });

  it('sends hsn_code and gst_rate in the create payload in normalized form', async () => {
    renderCreate();
    fireEvent.change(await screen.findByPlaceholderText('e.g. Summer Floral Dress'), {
      target: { value: 'Kids Cotton T-Shirt' },
    });
    fireEvent.change(screen.getByPlaceholderText('Detailed product description...'), {
      target: { value: 'Soft cotton t-shirt for kids' },
    });
    fireEvent.change(document.querySelector('select[name="category_id"]'), {
      target: { value: '2' },
    });
    fireEvent.change(byName('price'), { target: { value: '599' } });
    fireEvent.change(byName('hsn_code'), { target: { value: '6109' } });
    fireEvent.change(byName('gst_rate'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: /create product/i }));
    await waitFor(() => expect(createProduct).toHaveBeenCalled());
    expect(createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ hsn_code: '6109', gst_rate: 18 })
    );
  });

  it('sends updated hsn_code and gst_rate in the update payload (edit mode)', async () => {
    getProduct.mockResolvedValue({
      data: { ...baseProduct, hsn_code: '6109', gst_rate: 5 },
    });
    renderEdit();
    const hsn = await screen.findByPlaceholderText('Max 8 characters');
    fireEvent.change(hsn, { target: { value: '6201' } });
    fireEvent.change(byName('gst_rate'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /update product/i }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalled());
    expect(updateProduct).toHaveBeenCalledWith(
      '5',
      expect.objectContaining({ hsn_code: '6201', gst_rate: 12 })
    );
  });

  it('omits hsn_code and gst_rate from the payload when left blank', async () => {
    renderEdit();
    await screen.findByPlaceholderText('Max 8 characters');
    fireEvent.click(screen.getByRole('button', { name: /update product/i }));
    await waitFor(() => expect(updateProduct).toHaveBeenCalled());
    expect(updateProduct).toHaveBeenCalledWith(
      '5',
      expect.not.objectContaining({ hsn_code: expect.anything() })
    );
    expect(updateProduct).toHaveBeenCalledWith(
      '5',
      expect.not.objectContaining({ gst_rate: expect.anything() })
    );
  });
});