import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AdminCategoryForm from '../AdminCategoryForm';

const getCategories = vi.fn();
const createCategory = vi.fn();
const updateCategory = vi.fn();

vi.mock('../../../services/adminApi', () => ({
  adminAPI: {
    getCategories: (opts) => getCategories(opts),
    createCategory: (payload) => createCategory(payload),
    updateCategory: (id, payload) => updateCategory(id, payload),
  },
}));

const baseCategory = {
  id: 7,
  name: 'Kids T-Shirts',
  slug: 'kids-t-shirts',
  description: 'T-shirts for kids',
  parent_id: null,
  is_active: true,
  hsn_code: '',
  gst_rate: null,
  meta_title: '',
  meta_description: '',
  meta_keywords: '',
};

const byName = (name) => document.querySelector(`input[name="${name}"]`);

const renderCreate = () =>
  render(
    <MemoryRouter initialEntries={['/admin/categories/new']}>
      <Routes>
        <Route path="/admin/categories/new" element={<AdminCategoryForm />} />
      </Routes>
    </MemoryRouter>
  );

const renderEdit = () =>
  render(
    <MemoryRouter initialEntries={['/admin/categories/7/edit']}>
      <Routes>
        <Route path="/admin/categories/:id/edit" element={<AdminCategoryForm />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  getCategories.mockResolvedValue({ data: [{ ...baseCategory }] });
  createCategory.mockResolvedValue({ data: {} });
  updateCategory.mockResolvedValue({ data: {} });
});

describe('AdminCategoryForm - HSN Code & GST Rate', () => {
  it('renders HSN Code and GST Rate inputs with correct constraints (create mode)', async () => {
    getCategories.mockResolvedValue({ data: [] });
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
    getCategories.mockResolvedValue({
      data: [{ ...baseCategory, hsn_code: '6109', gst_rate: 5 }],
    });
    renderEdit();
    const hsn = await screen.findByPlaceholderText('Max 8 characters');
    expect(hsn.value).toBe('6109');
    const gst = screen.getByPlaceholderText('0 to 100');
    expect(gst.value).toBe('5');
  });

  it('sends hsn_code and gst_rate in the create payload in normalized form', async () => {
    getCategories.mockResolvedValue({ data: [] });
    renderCreate();
    fireEvent.change(await screen.findByPlaceholderText('e.g. Summer Collection'), {
      target: { value: 'Kids T-Shirts' },
    });
    fireEvent.change(byName('hsn_code'), { target: { value: '6109' } });
    fireEvent.change(byName('gst_rate'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: /create category/i }));
    await waitFor(() => expect(createCategory).toHaveBeenCalled());
    expect(createCategory).toHaveBeenCalledWith(
      expect.objectContaining({ hsn_code: '6109', gst_rate: 18 })
    );
  });

  it('sends updated hsn_code and gst_rate in the update payload (edit mode)', async () => {
    getCategories.mockResolvedValue({
      data: [{ ...baseCategory, hsn_code: '6109', gst_rate: 5 }],
    });
    renderEdit();
    const hsn = await screen.findByPlaceholderText('Max 8 characters');
    fireEvent.change(hsn, { target: { value: '6201' } });
    fireEvent.change(byName('gst_rate'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /update category/i }));
    await waitFor(() => expect(updateCategory).toHaveBeenCalled());
    expect(updateCategory).toHaveBeenCalledWith(
      '7',
      expect.objectContaining({ hsn_code: '6201', gst_rate: 12 })
    );
  });

  it('omits hsn_code and gst_rate from the payload when left blank', async () => {
    renderEdit();
    await screen.findByPlaceholderText('Max 8 characters');
    fireEvent.click(screen.getByRole('button', { name: /update category/i }));
    await waitFor(() => expect(updateCategory).toHaveBeenCalled());
    expect(updateCategory).toHaveBeenCalledWith(
      '7',
      expect.not.objectContaining({ hsn_code: expect.anything() })
    );
    expect(updateCategory).toHaveBeenCalledWith(
      '7',
      expect.not.objectContaining({ gst_rate: expect.anything() })
    );
  });
});