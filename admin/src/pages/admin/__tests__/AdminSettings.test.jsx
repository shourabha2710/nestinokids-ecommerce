import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AdminSettings from '../AdminSettings';

const baseSettings = {
  store_name: 'NestinoKids',
  store_email: '',
  store_phone: '',
  store_address: '',
  logo_url: null,
  favicon_url: null,
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  gst_number: '',
  tax_enabled: false,
  tax_percentage: 0,
  seller_state: '',
  shipping_gst_rate: null,
  free_shipping_enabled: false,
  free_shipping_min: '',
  cod_enabled: true,
  online_payment_enabled: false,
  maintenance_mode: false,
  direct_checkout_enabled: false,
  marketplace_purchase_enabled: true,
  default_meta_title: '',
  default_meta_description: '',
  default_meta_keywords: '',
  default_og_image: null,
  default_canonical_url: null,
};

const updateSettings = vi.fn();
const getSettings = vi.fn();

vi.mock('../../../services/settingsApi', () => ({
  settingsApi: {
    getSettings: () => getSettings(),
    updateSettings: (data) => updateSettings(data),
  },
}));

const renderSettings = () => render(<AdminSettings />);

const openTab = async (label) => {
  fireEvent.click(await screen.findByRole('button', { name: label }));
};

beforeEach(() => {
  vi.clearAllMocks();
  getSettings.mockResolvedValue({ data: { ...baseSettings } });
  updateSettings.mockImplementation(async (data) => ({
    data: { ...baseSettings, ...data },
  }));
});

describe('AdminSettings - Tax tab (Seller State)', () => {
  it('renders the Seller State selector with Delhi selectable and no value preselected', async () => {
    renderSettings();
    await openTab('Tax');
    const select = await screen.findByLabelText('Seller State');
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('');
    const delhi = [...select.querySelectorAll('option')].find((o) => o.value === 'Delhi');
    expect(delhi).toBeTruthy();
  });

  it('loads an existing seller_state value into the form', async () => {
    getSettings.mockResolvedValue({ data: { ...baseSettings, seller_state: 'Karnataka' } });
    renderSettings();
    await openTab('Tax');
    const select = await screen.findByLabelText('Seller State');
    expect(select.value).toBe('Karnataka');
  });

  it('updates form state when seller_state changes', async () => {
    renderSettings();
    await openTab('Tax');
    const select = await screen.findByLabelText('Seller State');
    fireEvent.change(select, { target: { value: 'Delhi' } });
    expect(select.value).toBe('Delhi');
  });

  it('includes seller_state in the save payload only when changed', async () => {
    renderSettings();
    await openTab('Tax');
    const select = await screen.findByLabelText('Seller State');
    fireEvent.change(select, { target: { value: 'Delhi' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(updateSettings).toHaveBeenCalled());
    expect(updateSettings).toHaveBeenCalledWith({ seller_state: 'Delhi' });
  });

  it('does not pre-populate Delhi when the stored value is empty', async () => {
    renderSettings();
    await openTab('Tax');
    const select = await screen.findByLabelText('Seller State');
    expect(select.value).toBe('');
    expect(select).not.toHaveValue('Delhi');
  });
});

describe('AdminSettings - Shipping tab (Shipping GST Rate)', () => {
  it('renders the Shipping GST Rate numeric field', async () => {
    renderSettings();
    await openTab('Shipping');
    const input = await screen.findByLabelText('Shipping GST Rate (%)');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('max', '100');
  });

  it('loads an existing shipping_gst_rate value', async () => {
    getSettings.mockResolvedValue({ data: { ...baseSettings, shipping_gst_rate: 18 } });
    renderSettings();
    await openTab('Shipping');
    const input = await screen.findByLabelText('Shipping GST Rate (%)');
    expect(input.value).toBe('18');
  });

  it('updates form state when the value changes', async () => {
    renderSettings();
    await openTab('Shipping');
    const input = await screen.findByLabelText('Shipping GST Rate (%)');
    fireEvent.change(input, { target: { value: '12.5' } });
    expect(input.value).toBe('12.5');
  });

  it('includes shipping_gst_rate in the save payload when changed', async () => {
    renderSettings();
    await openTab('Tax');
    fireEvent.click(await screen.findByRole('switch'));
    await openTab('Shipping');
    const input = await screen.findByLabelText('Shipping GST Rate (%)');
    fireEvent.change(input, { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(updateSettings).toHaveBeenCalled());
    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ tax_enabled: true, shipping_gst_rate: 18 })
    );
  });

  it('disables the field when tax_enabled is false and enables it when tax is enabled', async () => {
    renderSettings();
    await openTab('Shipping');
    const disabled = await screen.findByLabelText('Shipping GST Rate (%)');
    expect(disabled).toBeDisabled();

    await openTab('Tax');
    fireEvent.click(await screen.findByRole('switch'));
    await openTab('Shipping');
    const enabled = screen.getByLabelText('Shipping GST Rate (%)');
    expect(enabled).not.toBeDisabled();
  });
});